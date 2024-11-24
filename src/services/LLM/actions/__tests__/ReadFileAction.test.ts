import { FileOperations } from "@services/FileManagement/FileOperations";
import { FileSearch } from "@services/FileManagement/FileSearch";
import { ActionTagsExtractor } from "@services/LLM/actions/ActionTagsExtractor";
import { ReadFileAction } from "@services/LLM/actions/ReadFileAction";
import { DebugLogger } from "@services/logging/DebugLogger";

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

  beforeEach(() => {
    mockFileOperations = {
      read: jest.fn(),
      readMultiple: jest.fn(),
      exists: jest.fn(),
    } as any;

    mockFileSearch = {
      findByName: jest.fn(),
    } as any;

    mockActionTagsExtractor = {
      extractTag: jest.fn(),
    } as any;

    mockDebugLogger = {
      log: jest.fn(),
    } as any;

    readFileAction = new ReadFileAction(
      mockActionTagsExtractor,
      mockFileOperations,
      mockDebugLogger,
      mockFileSearch,
    );
  });

  describe("parameter extraction", () => {
    it("should handle single path tag", async () => {
      // Setup
      const filePath = "/test/file.ts";
      const actionContent = `
        <read_file>
          <path>${filePath}</path>
        </read_file>`;

      // Mock path extraction using ActionTagsExtractor for non-path parameters
      mockActionTagsExtractor.extractTag.mockImplementation((_, tag) => {
        if (tag !== "path") return null;
        return [filePath];
      });

      mockFileOperations.exists.mockResolvedValue(true);
      mockFileOperations.read.mockResolvedValue({
        success: true,
        data: "file content",
      });

      // Execute
      const result = await readFileAction.execute(actionContent);

      // Verify
      expect(result.success).toBe(true);
      expect(mockFileOperations.read).toHaveBeenCalledWith(filePath);
    });

    it("should handle multiple path tags", async () => {
      // Setup
      const filePaths = ["/test/file1.ts", "/test/file2.ts"];
      const actionContent = `
        <read_file>
          <path>${filePaths[0]}</path>
          <path>${filePaths[1]}</path>
        </read_file>`;

      // Mock path extraction using ActionTagsExtractor for non-path parameters
      mockActionTagsExtractor.extractTag.mockImplementation((_, tag) => {
        if (tag !== "path") return null;
        return filePaths;
      });

      mockFileOperations.exists.mockResolvedValue(true);
      mockFileOperations.readMultiple.mockResolvedValue({
        success: true,
        data: `[File: ${filePaths[0]}]\ncontent1\n[File: ${filePaths[1]}]\ncontent2`,
      });

      // Execute
      const result = await readFileAction.execute(actionContent);

      // Verify
      expect(result.success).toBe(true);
      expect(mockFileOperations.readMultiple).toHaveBeenCalledWith(filePaths);
    });
  });

  describe("file operations", () => {
    it("should find alternative path when file not found", async () => {
      // Setup
      const originalPath = "/test/file.ts";
      const alternativePath = "/found/file.ts";
      const actionContent = `
        <read_file>
          <path>${originalPath}</path>
        </read_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((_, tag) => {
        if (tag !== "path") return null;
        return [originalPath];
      });

      mockFileOperations.exists.mockResolvedValue(false);
      mockFileSearch.findByName.mockResolvedValue([alternativePath]);
      mockFileOperations.read.mockResolvedValue({
        success: true,
        data: "file content",
      });

      // Execute
      const result = await readFileAction.execute(actionContent);

      // Verify
      expect(result.success).toBe(true);
      expect(mockFileSearch.findByName).toHaveBeenCalled();
      expect(mockFileOperations.read).toHaveBeenCalledWith(alternativePath);
    });

    it("should handle multiple file read failure", async () => {
      // Setup
      const filePaths = ["/test/file1.ts", "/test/file2.ts"];
      const actionContent = `
        <read_file>
          <path>${filePaths[0]}</path>
          <path>${filePaths[1]}</path>
        </read_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((_, tag) => {
        if (tag !== "path") return null;
        return filePaths;
      });

      mockFileOperations.exists.mockResolvedValue(true);
      mockFileOperations.readMultiple.mockResolvedValue({
        success: false,
        error: new Error("Failed to read files"),
      });

      // Execute
      const result = await readFileAction.execute(actionContent);

      // Verify
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Failed to read files");
    });
  });

  describe("validation", () => {
    it("should fail when no path tags are provided", async () => {
      // Setup
      const actionContent = "<read_file></read_file>";

      mockActionTagsExtractor.extractTag.mockReturnValue(null);

      // Execute
      const result = await readFileAction.execute(actionContent);

      // Verify
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(
        "Must include at least one <path> tag",
      );
    });

    it("should fail when path is empty", async () => {
      // Setup
      const actionContent = `
        <read_file>
          <path></path>
        </read_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((_, tag) => {
        if (tag !== "path") return null;
        return [""];
      });

      // Execute
      const result = await readFileAction.execute(actionContent);

      // Verify
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("Invalid paths found");
    });
  });
});
