import { FileOperations } from "../../../FileManagement/FileOperations";
import { PathAdjuster } from "../../../FileManagement/PathAdjuster";
import { IFileOperationResult } from "../../../FileManagement/types/FileManagementTypes";
import { DebugLogger } from "../../../logging/DebugLogger";
import { ActionTagsExtractor } from "../ActionTagsExtractor";
import { FileActions } from "../FileActions";

jest.mock("../../../FileManagement/FileOperations");
jest.mock("../ActionTagsExtractor");

describe("FileActions", () => {
  let fileActions: FileActions;
  let mockFileOperations: jest.Mocked<FileOperations>;
  let mockActionTagsExtractor: jest.Mocked<ActionTagsExtractor>;
  let mockDebugLogger: jest.Mocked<DebugLogger>;
  let mockPathAdjuster: jest.Mocked<PathAdjuster>;

  beforeEach(() => {
    mockFileOperations = new FileOperations(
      mockPathAdjuster,
      mockDebugLogger,
    ) as jest.Mocked<FileOperations>;
    mockActionTagsExtractor =
      new ActionTagsExtractor() as jest.Mocked<ActionTagsExtractor>;

    fileActions = new FileActions(mockFileOperations, mockActionTagsExtractor);

    // Setup default mock implementations
    mockActionTagsExtractor.extractTags.mockImplementation(() => []);
    mockActionTagsExtractor.extractTag.mockImplementation(() => null);
  });

  describe("handleReadFile", () => {
    it("should return an error if no <path> tags are provided", async () => {
      const content = `
        <read_file>
          <invalid_tag>invalid</invalid_tag>
        </read_file>
      `;

      const result = await fileActions.handleReadFile(content);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(
        "Invalid read_file format. Must include at least one <path> tag.",
      );
      expect(mockActionTagsExtractor.extractTags).toHaveBeenCalled();
    });

    it("should return an error if any file path is invalid", async () => {
      mockActionTagsExtractor.extractTags.mockReturnValue(["valid/path", ""]);

      const content = `
        <read_file>
          <path>valid/path</path>
          <path></path>
        </read_file>
      `;

      const result = await fileActions.handleReadFile(content);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(
        "Failed to read files:   - Try using a <search_file> to find the correct file path.",
      );
      expect(mockActionTagsExtractor.extractTags).toHaveBeenCalled();
    });

    it("should read a single file successfully", async () => {
      const mockReadResult: IFileOperationResult = {
        success: true,
        data: "file content",
        error: undefined,
      };
      mockActionTagsExtractor.extractTags.mockReturnValue(["valid/path"]);
      mockFileOperations.read.mockResolvedValue(mockReadResult);

      const content = `
        <read_file>
          <path>valid/path</path>
        </read_file>
      `;

      const result = await fileActions.handleReadFile(content);

      expect(result.success).toBe(true);
      expect(result.data).toBe("file content");
      expect(mockFileOperations.read).toHaveBeenCalledWith("valid/path");
      expect(mockActionTagsExtractor.extractTags).toHaveBeenCalled();
    });

    it("should read multiple files successfully", async () => {
      const mockReadResult: IFileOperationResult = {
        success: true,
        data: {
          "file1": "file1 content",
          "file2": "file2 content",
        },
        error: undefined,
      };
      mockActionTagsExtractor.extractTags.mockReturnValue(["path1", "path2"]);
      mockFileOperations.readMultiple.mockResolvedValue(mockReadResult);

      const content = `
        <read_file>
          <path>path1</path>
          <path>path2</path>
        </read_file>
      `;

      const result = await fileActions.handleReadFile(content);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        "file1": "file1 content",
        "file2": "file2 content",
      });
      expect(mockFileOperations.readMultiple).toHaveBeenCalledWith([
        "path1",
        "path2",
      ]);
      expect(mockActionTagsExtractor.extractTags).toHaveBeenCalled();
    });
  });
});