import { FileOperations } from "../../../FileManagement/FileOperations";
import { ActionTagsExtractor } from "../ActionTagsExtractor";
import { ReadFileAction } from "../ReadFileAction";

jest.mock("../../../FileManagement/FileOperations");
jest.mock("../ActionTagsExtractor");

describe("ReadFileAction", () => {
  let readFileAction: ReadFileAction;
  let mockFileOperations: jest.Mocked<FileOperations>;
  let mockActionTagsExtractor: jest.Mocked<ActionTagsExtractor>;

  beforeEach(() => {
    mockFileOperations = new FileOperations() as jest.Mocked<FileOperations>;
    mockActionTagsExtractor =
      new ActionTagsExtractor() as jest.Mocked<ActionTagsExtractor>;
    readFileAction = new ReadFileAction(
      mockFileOperations,
      mockActionTagsExtractor,
    );
  });

  it("should read a single file successfully", async () => {
    const filePath = "/path/to/single/file";
    const fileContent = "file content";
    const expectedResult = {
      success: true,
      data: fileContent,
    };

    mockActionTagsExtractor.extractTags = jest.fn().mockReturnValue([filePath]);
    mockFileOperations.read = jest.fn().mockResolvedValue(expectedResult);

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
      "/path/to/file1": "file1 content",
      "/path/to/file2": "file2 content",
    };
    const expectedResult = {
      success: true,
      data: fileContents,
    };

    mockActionTagsExtractor.extractTags = jest.fn().mockReturnValue(filePaths);
    mockFileOperations.readMultiple = jest
      .fn()
      .mockResolvedValue(expectedResult);

    const actionInput = `<read_file>${filePaths.map((path) => `<path>${path}</path>`).join("")}</read_file>`;
    const result = await readFileAction.execute(actionInput);

    expect(mockActionTagsExtractor.extractTags).toHaveBeenCalledWith(
      actionInput,
      "path",
    );
    expect(mockFileOperations.readMultiple).toHaveBeenCalledWith(filePaths);
  });

  it("should fail if no path tags are provided", async () => {
    mockActionTagsExtractor.extractTags = jest.fn().mockReturnValue([]);

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

  it("should handle file not found error for single file", async () => {
    const filePath = "/path/to/nonexistent/file";
    const expectedResult = {
      success: false,
      error: new Error("File not found"),
    };

    mockActionTagsExtractor.extractTags = jest.fn().mockReturnValue([filePath]);
    mockFileOperations.read = jest.fn().mockResolvedValue(expectedResult);

    const actionInput = `<read_file><path>${filePath}</path></read_file>`;
    const result = await readFileAction.execute(actionInput);

    expect(mockActionTagsExtractor.extractTags).toHaveBeenCalledWith(
      actionInput,
      "path",
    );
    expect(mockFileOperations.read).toHaveBeenCalledWith(filePath);
    expect(result).toEqual(expectedResult);
  });

  it("should handle missing files in multiple file read", async () => {
    const filePaths = ["/path/to/file1", "/path/to/file2"];
    const fileContents = {
      "/path/to/file1": "file1 content",
      // file2 is missing
    };
    const expectedResult = {
      success: true,
      data: fileContents,
    };

    mockActionTagsExtractor.extractTags = jest.fn().mockReturnValue(filePaths);
    mockFileOperations.readMultiple = jest
      .fn()
      .mockResolvedValue(expectedResult);

    const actionInput = `<read_file>${filePaths.map((path) => `<path>${path}</path>`).join("")}</read_file>`;
    const result = await readFileAction.execute(actionInput);

    expect(result).toEqual({
      success: false,
      error: new Error("Failed to read files: /path/to/file2"),
    });
  });

  it("should handle multiple file read failure", async () => {
    const filePaths = ["/path/to/file1", "/path/to/file2"];
    const expectedResult = {
      success: false,
      error: new Error("Failed to read multiple files"),
    };

    mockActionTagsExtractor.extractTags = jest.fn().mockReturnValue(filePaths);
    mockFileOperations.readMultiple = jest
      .fn()
      .mockResolvedValue(expectedResult);

    const actionInput = `<read_file>${filePaths.map((path) => `<path>${path}</path>`).join("")}</read_file>`;
    const result = await readFileAction.execute(actionInput);

    expect(mockActionTagsExtractor.extractTags).toHaveBeenCalledWith(
      actionInput,
      "path",
    );
    expect(mockFileOperations.readMultiple).toHaveBeenCalledWith(filePaths);
    expect(result).toEqual(expectedResult);
  });

  describe("logging", () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, "log").mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it("should log file paths and success for single file", async () => {
      const filePath = "/path/to/single/file";
      const fileContent = "file content";
      const expectedResult = {
        success: true,
        data: fileContent,
      };

      mockActionTagsExtractor.extractTags = jest
        .fn()
        .mockReturnValue([filePath]);
      mockFileOperations.read = jest.fn().mockResolvedValue(expectedResult);

      const actionInput = `<read_file><path>${filePath}</path></read_file>`;
      await readFileAction.execute(actionInput);

      expect(consoleSpy).toHaveBeenNthCalledWith(
        1,
        `📁 File paths: ${filePath}`,
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        2,
        "✅ Action completed successfully. Please wait...\n\n",
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(3, "-".repeat(50));
    });
  });
});
