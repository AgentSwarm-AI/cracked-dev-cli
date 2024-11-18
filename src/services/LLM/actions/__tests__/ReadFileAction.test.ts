import { FileOperations } from "../../../FileManagement/FileOperations";
import { DebugLogger } from "../../../logging/DebugLogger";
import { ActionTagsExtractor } from "../ActionTagsExtractor";
import { ReadFileAction } from "../ReadFileAction";

jest.mock("../../../FileManagement/FileOperations");
jest.mock("../ActionTagsExtractor");
jest.mock("../../../logging/DebugLogger");

describe("ReadFileAction", () => {
  let readFileAction: ReadFileAction;
  let mockFileOperations: jest.Mocked<FileOperations>;
  let mockActionTagsExtractor: jest.Mocked<ActionTagsExtractor>;
  let mockDebugLogger: jest.Mocked<DebugLogger>;

  beforeEach(() => {
    mockFileOperations = new FileOperations() as jest.Mocked<FileOperations>;
    mockActionTagsExtractor =
      new ActionTagsExtractor() as jest.Mocked<ActionTagsExtractor>;
    mockDebugLogger = new DebugLogger() as jest.Mocked<DebugLogger>;
    readFileAction = new ReadFileAction(
      mockFileOperations,
      mockActionTagsExtractor,
      mockDebugLogger,
    );
  });

  it("should read a single file successfully", async () => {
    const filePath = "/path/to/file";
    const fileContent = "file content";

    mockActionTagsExtractor.extractTags.mockReturnValue([filePath]);
    mockFileOperations.read.mockResolvedValue({
      success: true,
      data: fileContent,
    });

    const actionInput = `<read_file><path>${filePath}</path></read_file>`;
    const result = await readFileAction.execute(actionInput);

    expect(mockActionTagsExtractor.extractTags).toHaveBeenCalledWith(
      actionInput,
      "path",
    );
    expect(mockFileOperations.read).toHaveBeenCalledWith(filePath);
    expect(result).toEqual({ success: true, data: fileContent });
  });

  it("should read multiple files successfully", async () => {
    const filePaths = ["/path/to/file1", "/path/to/file2"];
    const fileContents = {
      "/path/to/file1": "content1",
      "/path/to/file2": "content2",
    };

    mockActionTagsExtractor.extractTags.mockReturnValue(filePaths);
    mockFileOperations.readMultiple.mockResolvedValue({
      success: true,
      data: fileContents,
    });

    const actionInput = `<read_file>${filePaths.map((path) => `<path>${path}</path>`).join("")}</read_file>`;
    const result = await readFileAction.execute(actionInput);

    expect(mockActionTagsExtractor.extractTags).toHaveBeenCalledWith(
      actionInput,
      "path",
    );
    expect(mockFileOperations.readMultiple).toHaveBeenCalledWith(filePaths);
    expect(result).toEqual({ success: true, data: fileContents });
  });

  it("should fail if no path tags are provided", async () => {
    mockActionTagsExtractor.extractTags.mockReturnValue([]);

    const actionInput = "<read_file></read_file>";
    const result = await readFileAction.execute(actionInput);

    expect(mockActionTagsExtractor.extractTags).toHaveBeenCalledWith(
      actionInput,
      "path",
    );
    expect(result).toEqual({
      success: false,
      error: new Error(
        "Invalid read_file format. Must include at least one <path> tag.",
      ),
    });
  });

  it("should handle file read failure", async () => {
    const filePath = "/path/to/file";
    const error = new Error("Read failed");

    mockActionTagsExtractor.extractTags.mockReturnValue([filePath]);
    mockFileOperations.read.mockResolvedValue({
      success: false,
      error,
    });

    const actionInput = `<read_file><path>${filePath}</path></read_file>`;
    const result = await readFileAction.execute(actionInput);

    expect(mockActionTagsExtractor.extractTags).toHaveBeenCalledWith(
      actionInput,
      "path",
    );
    expect(mockFileOperations.read).toHaveBeenCalledWith(filePath);
    expect(result).toEqual({ success: false, error });
  });

  it("should handle multiple file read failure", async () => {
    const filePaths = ["/path/to/file1", "/path/to/file2"];
    const error = new Error("Multiple read failed");

    mockActionTagsExtractor.extractTags.mockReturnValue(filePaths);
    mockFileOperations.readMultiple.mockResolvedValue({
      success: false,
      error,
    });

    const actionInput = `<read_file>${filePaths.map((path) => `<path>${path}</path>`).join("")}</read_file>`;
    const result = await readFileAction.execute(actionInput);

    expect(mockActionTagsExtractor.extractTags).toHaveBeenCalledWith(
      actionInput,
      "path",
    );
    expect(mockFileOperations.readMultiple).toHaveBeenCalledWith(filePaths);
    expect(result).toEqual({ success: false, error });
  });

  it("should handle empty file path", async () => {
    const filePath = "";
    mockActionTagsExtractor.extractTags.mockReturnValue([filePath]);

    const actionInput = `<read_file><path>${filePath}</path></read_file>`;
    const result = await readFileAction.execute(actionInput);

    expect(result).toEqual({
      success: false,
      error: new Error("Failed to read files: "),
    });
  });
});
