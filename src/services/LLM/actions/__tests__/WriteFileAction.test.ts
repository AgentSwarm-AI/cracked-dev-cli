import { FileOperations } from "../../../FileManagement/FileOperations";
import { PathAdjuster } from "../../../FileManagement/PathAdjuster";
import { DebugLogger } from "../../../logging/DebugLogger";
import { HtmlEntityDecoder } from "../../../text/HTMLEntityDecoder";
import { ActionTagsExtractor } from "../ActionTagsExtractor";
import { WriteFileAction } from "../WriteFileAction";

jest.mock("../../../FileManagement/FileOperations");
jest.mock("../ActionTagsExtractor");
jest.mock("../../../text/HTMLEntityDecoder");

describe("WriteFileAction", () => {
  let writeFileAction: WriteFileAction;
  let mockFileOperations: jest.Mocked<FileOperations>;
  let mockActionTagsExtractor: jest.Mocked<ActionTagsExtractor>;
  let mockHtmlEntityDecoder: jest.Mocked<HtmlEntityDecoder>;
  let mockPathAdjuster: jest.Mocked<PathAdjuster>;
  let mockDebugLogger: jest.Mocked<DebugLogger>;
  beforeEach(() => {
    mockFileOperations = new FileOperations(
      mockPathAdjuster,
      mockDebugLogger,
    ) as jest.Mocked<FileOperations>;
    mockActionTagsExtractor =
      new ActionTagsExtractor() as jest.Mocked<ActionTagsExtractor>;
    mockHtmlEntityDecoder =
      new HtmlEntityDecoder() as jest.Mocked<HtmlEntityDecoder>;
    writeFileAction = new WriteFileAction(
      mockFileOperations,
      mockActionTagsExtractor,
      mockHtmlEntityDecoder,
    );
  });

  it("should write file successfully", async () => {
    const filePath = "/path/to/file";
    const fileContent = "file content";
    const decodedContent = "decoded content";

    mockActionTagsExtractor.extractTag.mockImplementation((content, tag) => {
      if (tag === "path") return filePath;
      if (tag === "content") return fileContent;
      return null;
    });
    mockHtmlEntityDecoder.decode.mockReturnValue(decodedContent);
    mockFileOperations.exists.mockResolvedValue(false);
    mockFileOperations.write.mockResolvedValue({
      success: true,
      data: "File written successfully",
    });

    const actionInput = `<write_file><path>${filePath}</path><content>${fileContent}</content></write_file>`;
    const result = await writeFileAction.execute(actionInput);

    expect(mockActionTagsExtractor.extractTag).toHaveBeenCalledWith(
      actionInput,
      "path",
    );
    expect(mockActionTagsExtractor.extractTag).toHaveBeenCalledWith(
      actionInput,
      "content",
    );
    expect(mockHtmlEntityDecoder.decode).toHaveBeenCalledWith(fileContent);
    expect(mockFileOperations.write).toHaveBeenCalledWith(
      filePath,
      decodedContent,
    );
    expect(result).toEqual({
      success: true,
      data: "File written successfully",
    });
  });

  it("should prevent large content removal (>80%)", async () => {
    const filePath = "/path/to/file";
    const existingContent =
      "This is a long existing content with multiple lines\nand more content\nand even more content";
    const newContent = "Short content"; // Much shorter than existing

    mockActionTagsExtractor.extractTag.mockImplementation((content, tag) => {
      if (tag === "path") return filePath;
      if (tag === "content") return newContent;
      return null;
    });
    mockFileOperations.exists.mockResolvedValue(true);
    mockFileOperations.read.mockResolvedValue({
      success: true,
      data: existingContent,
    });

    const actionInput = `<write_file><path>${filePath}</path><content>${newContent}</content></write_file>`;
    const result = await writeFileAction.execute(actionInput);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Prevented removal of");
    expect(mockFileOperations.write).not.toHaveBeenCalled();
  });

  it("should allow normal content changes (<80% removal)", async () => {
    const filePath = "/path/to/file";
    const existingContent = "Original content with some text";
    const newContent = "Modified content with text"; // Similar length

    mockActionTagsExtractor.extractTag.mockImplementation((content, tag) => {
      if (tag === "path") return filePath;
      if (tag === "content") return newContent;
      return null;
    });
    mockFileOperations.exists.mockResolvedValue(true);
    mockFileOperations.read.mockResolvedValue({
      success: true,
      data: existingContent,
    });
    mockHtmlEntityDecoder.decode.mockReturnValue(newContent);
    mockFileOperations.write.mockResolvedValue({
      success: true,
    });

    const actionInput = `<write_file><path>${filePath}</path><content>${newContent}</content></write_file>`;
    const result = await writeFileAction.execute(actionInput);

    expect(result.success).toBe(true);
    expect(mockFileOperations.write).toHaveBeenCalledWith(filePath, newContent);
  });

  it("should skip removal check for new files", async () => {
    const filePath = "/path/to/new/file";
    const newContent = "Brand new content";

    mockActionTagsExtractor.extractTag.mockImplementation((content, tag) => {
      if (tag === "path") return filePath;
      if (tag === "content") return newContent;
      return null;
    });
    mockFileOperations.exists.mockResolvedValue(false);
    mockHtmlEntityDecoder.decode.mockReturnValue(newContent);
    mockFileOperations.write.mockResolvedValue({
      success: true,
    });

    const actionInput = `<write_file><path>${filePath}</path><content>${newContent}</content></write_file>`;
    const result = await writeFileAction.execute(actionInput);

    expect(result.success).toBe(true);
    expect(mockFileOperations.read).not.toHaveBeenCalled();
    expect(mockFileOperations.write).toHaveBeenCalledWith(filePath, newContent);
  });

  it("should fail if path tag is missing", async () => {
    mockActionTagsExtractor.extractTag.mockImplementation((content, tag) => {
      if (tag === "path") return null;
      if (tag === "content") return "some content";
      return null;
    });

    const actionInput =
      "<write_file><content>some content</content></write_file>";
    const result = await writeFileAction.execute(actionInput);

    expect(result).toEqual({
      success: false,
      error: new Error(
        "Invalid write_file format. Must include both <path> and <content> tags.",
      ),
    });
  });

  it("should fail if content tag is missing", async () => {
    mockActionTagsExtractor.extractTag.mockImplementation((content, tag) => {
      if (tag === "path") return "/path/to/file";
      if (tag === "content") return null;
      return null;
    });

    const actionInput = "<write_file><path>/path/to/file</path></write_file>";
    const result = await writeFileAction.execute(actionInput);

    expect(result).toEqual({
      success: false,
      error: new Error(
        "Invalid write_file format. Must include both <path> and <content> tags.",
      ),
    });
  });

  it("should handle write operation failure", async () => {
    const filePath = "/path/to/file";
    const fileContent = "file content";
    const error = new Error("Write failed");

    mockActionTagsExtractor.extractTag.mockImplementation((content, tag) => {
      if (tag === "path") return filePath;
      if (tag === "content") return fileContent;
      return null;
    });
    mockHtmlEntityDecoder.decode.mockReturnValue(fileContent);
    mockFileOperations.exists.mockResolvedValue(false);
    mockFileOperations.write.mockResolvedValue({
      success: false,
      error,
    });

    const actionInput = `<write_file><path>${filePath}</path><content>${fileContent}</content></write_file>`;
    const result = await writeFileAction.execute(actionInput);

    expect(mockFileOperations.write).toHaveBeenCalledWith(
      filePath,
      fileContent,
    );
    expect(result).toEqual({
      success: false,
      error,
    });
  });
});
