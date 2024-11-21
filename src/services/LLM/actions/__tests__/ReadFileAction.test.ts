import { FileOperations } from "@services/FileManagement/FileOperations";
import { FileSearch } from "@services/FileManagement/FileSearch";
import { PathAdjuster } from "@services/FileManagement/PathAdjuster";
import { ActionTagsExtractor } from "@services/LLM/actions/ActionTagsExtractor";
import { DebugLogger } from "@services/logging/DebugLogger";
import { ReadFileAction } from "../ReadFileAction";

jest.mock("@services/FileManagement/FileOperations");
jest.mock("@services/FileManagement/FileSearch");
jest.mock("@services/LLM/actions/ActionTagsExtractor");
jest.mock("@services/logging/DebugLogger");

describe("ReadFileAction", () => {
  let readFileAction: ReadFileAction;
  let mockFileOperations: jest.Mocked<FileOperations>;
  let mockFileSearch: jest.Mocked<FileSearch>;
  let mockActionTagsExtractor: jest.Mocked<ActionTagsExtractor>;
  let mockDebugLogger: jest.Mocked<DebugLogger>;
  let mockPathAdjuster: jest.Mocked<PathAdjuster>;

  beforeEach(() => {
    mockFileOperations = new FileOperations(
      mockPathAdjuster,
      mockDebugLogger,
    ) as jest.Mocked<FileOperations>;
    mockFileSearch = new FileSearch() as jest.Mocked<FileSearch>;
    mockActionTagsExtractor =
      new ActionTagsExtractor() as jest.Mocked<ActionTagsExtractor>;
    mockDebugLogger = new DebugLogger() as jest.Mocked<DebugLogger>;
    readFileAction = new ReadFileAction(
      mockFileOperations,
      mockActionTagsExtractor,
      mockDebugLogger,
      mockFileSearch,
    );
  });

  it("should read a single file successfully", async () => {
    const filePath = "/path/to/file";
    const fileContent = "file content";

    mockActionTagsExtractor.extractTags.mockReturnValue([filePath]);
    mockFileOperations.exists.mockResolvedValue(true);
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

  it("should search and read a single file when not found at original path", async () => {
    const originalPath = "/path/to/file";
    const foundPath = "/different/path/to/file";
    const fileContent = "file content";

    mockActionTagsExtractor.extractTags.mockReturnValue([originalPath]);
    mockFileOperations.exists.mockResolvedValue(false);
    mockFileSearch.findByName.mockResolvedValue([foundPath]);
    mockFileOperations.read.mockResolvedValue({
      success: true,
      data: fileContent,
    });

    const actionInput = `<read_file><path>${originalPath}</path></read_file>`;
    const result = await readFileAction.execute(actionInput);

    expect(mockFileSearch.findByName).toHaveBeenCalledWith(
      "file",
      process.cwd(),
    );
    expect(mockFileOperations.read).toHaveBeenCalledWith(foundPath);
    expect(result).toEqual({ success: true, data: fileContent });
  });

  it("should read multiple files successfully", async () => {
    const filePaths = ["/path/to/file1", "/path/to/file2"];
    const fileContents = `[File: /path/to/file1]\ncontent1\n\n[File: /path/to/file2]\ncontent2`;

    mockActionTagsExtractor.extractTags.mockReturnValue(filePaths);
    mockFileOperations.exists.mockResolvedValue(true);
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

  it("should search and read multiple files when some not found at original paths", async () => {
    const originalPaths = ["/path/to/file1", "/path/to/file2"];
    const foundPath = "/different/path/to/file2";
    const fileContents = `[File: /path/to/file1]\ncontent1\n\n[File: ${foundPath}]\ncontent2`;

    mockActionTagsExtractor.extractTags.mockReturnValue(originalPaths);
    mockFileOperations.exists
      .mockResolvedValueOnce(true) // file1 exists
      .mockResolvedValueOnce(false); // file2 doesn't exist
    mockFileSearch.findByName.mockResolvedValue([foundPath]);
    mockFileOperations.readMultiple.mockResolvedValue({
      success: true,
      data: fileContents,
    });

    const actionInput = `<read_file>${originalPaths.map((path) => `<path>${path}</path>`).join("")}</read_file>`;
    const result = await readFileAction.execute(actionInput);

    expect(mockFileSearch.findByName).toHaveBeenCalledWith(
      "file2",
      process.cwd(),
    );
    expect(mockFileOperations.readMultiple).toHaveBeenCalledWith([
      originalPaths[0],
      foundPath,
    ]);
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
    mockFileOperations.exists.mockResolvedValue(true);
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
    mockFileOperations.exists.mockResolvedValue(true);
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

    expect(result).toMatchObject({
      success: false,
      error: new Error(
        "Failed to read files:  - Try using a <search_file> to find the correct file path.",
      ),
    });
  });

  it("should handle missing files in multiple read result", async () => {
    const filePaths = ["/path/to/file1", "/path/to/file2"];
    const incompleteContent = `[File: /path/to/file1]\ncontent1`; // missing file2

    mockActionTagsExtractor.extractTags.mockReturnValue(filePaths);
    mockFileOperations.exists.mockResolvedValue(true);
    mockFileOperations.readMultiple.mockResolvedValue({
      success: true,
      data: incompleteContent,
    });

    const actionInput = `<read_file>${filePaths.map((path) => `<path>${path}</path>`).join("")}</read_file>`;
    const result = await readFileAction.execute(actionInput);

    expect(result).toEqual({
      success: false,
      error: new Error(
        "Failed to read files: /path/to/file2. Try using search_file action to find the proper path.",
      ),
    });
  });
});
