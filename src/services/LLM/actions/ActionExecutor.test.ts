import { container } from "tsyringe";
import { FileOperations } from "../../FileManagement/FileOperations";
import { FileSearch } from "../../FileManagement/FileSearch";
import { HtmlEntityDecoder } from "../../text/HTMLEntityDecoder";
import { ActionExecutor } from "./ActionExecutor";
import { ActionTagsExtractor } from "./ActionTagsExtractor";

jest.mock("../../FileManagement/FileOperations");
jest.mock("../../FileManagement/FileSearch");
jest.mock("./ActionTagsExtractor");
jest.mock("../../text/HTMLEntityDecoder");
jest.mock("child_process");

describe("ActionExecutor", () => {
  let actionExecutor: ActionExecutor;
  let mockFileOperations: jest.Mocked<FileOperations>;
  let mockFileSearch: jest.Mocked<FileSearch>;
  let mockTagsExtractor: jest.Mocked<ActionTagsExtractor>;
  let mockHtmlEntityDecoder: jest.Mocked<HtmlEntityDecoder>;

  beforeEach(() => {
    mockFileOperations = container.resolve(
      FileOperations,
    ) as jest.Mocked<FileOperations>;
    mockFileSearch = container.resolve(FileSearch) as jest.Mocked<FileSearch>;
    mockTagsExtractor = container.resolve(
      ActionTagsExtractor,
    ) as jest.Mocked<ActionTagsExtractor>;
    mockHtmlEntityDecoder = container.resolve(
      HtmlEntityDecoder,
    ) as jest.Mocked<HtmlEntityDecoder>;

    actionExecutor = new ActionExecutor(
      mockFileOperations,
      mockFileSearch,
      mockTagsExtractor,
      mockHtmlEntityDecoder,
    );
  });

  describe("executeAction", () => {
    it("should return error for invalid action format", async () => {
      const result = await actionExecutor.executeAction("invalid action");
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Invalid action format");
    });

    it("should return error for unknown action type", async () => {
      const result = await actionExecutor.executeAction(
        "<unknown>content</unknown>",
      );
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Unknown action type: unknown");
    });

    it("should handle empty action content", async () => {
      mockTagsExtractor.extractTags.mockReturnValue([]);
      const result = await actionExecutor.executeAction(
        "<read_file></read_file>",
      );
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(
        "Invalid read_file format. Must include at least one <path> tag.",
      );
    });
  });

  describe("read_file action", () => {
    it("should handle single file read successfully", async () => {
      mockTagsExtractor.extractTags.mockReturnValue(["test.txt"]);
      mockFileOperations.read.mockResolvedValue({
        success: true,
        data: "file content",
      });

      const result = await actionExecutor.executeAction(
        "<read_file><path>test.txt</path></read_file>",
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe("file content");
      expect(mockFileOperations.read).toHaveBeenCalledWith("test.txt");
    });

    it("should handle multiple file read successfully", async () => {
      mockTagsExtractor.extractTags.mockReturnValue(["file1.txt", "file2.txt"]);
      mockFileOperations.readMultiple.mockResolvedValue({
        success: true,
        data: {
          "file1.txt": "content 1",
          "file2.txt": "content 2",
        },
      });

      const result = await actionExecutor.executeAction(
        "<read_file><path>file1.txt</path><path>file2.txt</path></read_file>",
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        "file1.txt": "content 1",
        "file2.txt": "content 2",
      });
      expect(mockFileOperations.readMultiple).toHaveBeenCalledWith([
        "file1.txt",
        "file2.txt",
      ]);
    });

    it("should handle multiple file read failure", async () => {
      mockTagsExtractor.extractTags.mockReturnValue(["file1.txt", "file2.txt"]);
      mockFileOperations.readMultiple.mockResolvedValue({
        success: false,
        error: new Error("Failed to read files: file2.txt: File not found"),
      });

      const result = await actionExecutor.executeAction(
        "<read_file><path>file1.txt</path><path>file2.txt</path></read_file>",
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(
        "Failed to read files: file2.txt: File not found",
      );
    });

    it("should handle single file read failure", async () => {
      mockTagsExtractor.extractTags.mockReturnValue(["test.txt"]);
      mockFileOperations.read.mockResolvedValue({
        success: false,
        error: new Error("File not found"),
      });

      const result = await actionExecutor.executeAction(
        "<read_file><path>test.txt</path></read_file>",
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("File not found");
    });

    it("should handle read_file with path containing spaces", async () => {
      mockTagsExtractor.extractTags.mockReturnValue([
        "path with spaces/test.txt",
      ]);
      mockFileOperations.read.mockResolvedValue({
        success: true,
        data: "file content",
      });

      const result = await actionExecutor.executeAction(
        "<read_file><path>path with spaces/test.txt</path></read_file>",
      );

      expect(result.success).toBe(true);
      expect(mockFileOperations.read).toHaveBeenCalledWith(
        "path with spaces/test.txt",
      );
    });
  });

  describe("write_file action", () => {
    it("should handle write_file action successfully", async () => {
      mockTagsExtractor.extractTag
        .mockReturnValueOnce("test.txt")
        .mockReturnValueOnce("Hello World");
      mockHtmlEntityDecoder.decode.mockReturnValue(
        "<path>test.txt</path><content>Hello World</content>",
      );
      mockFileOperations.write.mockResolvedValue({ success: true });

      const result = await actionExecutor.executeAction(`
        <write_file>
          <path>test.txt</path>
          <content>Hello World</content>
        </write_file>
      `);

      expect(result.success).toBe(true);
      expect(mockFileOperations.write).toHaveBeenCalledWith(
        "test.txt",
        "Hello World",
      );
    });

    it("should handle invalid write_file format", async () => {
      mockTagsExtractor.extractTag.mockReturnValue(null);
      const result = await actionExecutor.executeAction(
        "<write_file><path>test.txt</path></write_file>",
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(
        "Invalid write_file format. Must include both <path> and <content> tags.",
      );
    });

    it("should fail when write_file has empty content", async () => {
      mockTagsExtractor.extractTag
        .mockReturnValueOnce("test.txt")
        .mockReturnValueOnce("");

      const result = await actionExecutor.executeAction(`
        <write_file>
          <path>test.txt</path>
          <content></content>
        </write_file>
      `);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(
        "Invalid write_file format. Must include both <path> and <content> tags.",
      );
      // File write should not be called due to validation failure
      expect(mockFileOperations.write).not.toHaveBeenCalled();
    });
  });

  describe("delete_file action", () => {
    it("should handle delete_file action successfully", async () => {
      mockTagsExtractor.extractTag.mockReturnValue("test.txt");
      mockFileOperations.delete.mockResolvedValue({ success: true });

      const result = await actionExecutor.executeAction(
        "<delete_file><path>test.txt</path></delete_file>",
      );

      expect(result.success).toBe(true);
      expect(mockFileOperations.delete).toHaveBeenCalledWith("test.txt");
    });

    it("should handle delete_file failure", async () => {
      mockTagsExtractor.extractTag.mockReturnValue("test.txt");
      mockFileOperations.delete.mockResolvedValue({
        success: false,
        error: new Error("Permission denied"),
      });

      const result = await actionExecutor.executeAction(
        "<delete_file><path>test.txt</path></delete_file>",
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Permission denied");
    });
  });

  describe("move_file action", () => {
    it("should handle move_file action successfully", async () => {
      mockTagsExtractor.extractTag
        .mockReturnValueOnce("source.txt")
        .mockReturnValueOnce("dest.txt");
      mockFileOperations.move.mockResolvedValue({ success: true });

      const result = await actionExecutor.executeAction(`
        <move_file>
          <source_path>source.txt</source_path>
          <destination_path>dest.txt</destination_path>
        </move_file>
      `);

      expect(result.success).toBe(true);
      expect(mockFileOperations.move).toHaveBeenCalledWith(
        "source.txt",
        "dest.txt",
      );
    });

    it("should handle invalid move_file format", async () => {
      mockTagsExtractor.extractTag.mockReturnValue(null);
      const result = await actionExecutor.executeAction(
        "<move_file><source_path>source.txt</source_path></move_file>",
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(
        "Invalid move_file format. Must include both <source_path> and <destination_path> tags.",
      );
    });

    it("should handle move_file failure", async () => {
      mockTagsExtractor.extractTag
        .mockReturnValueOnce("source.txt")
        .mockReturnValueOnce("dest.txt");
      mockFileOperations.move.mockResolvedValue({
        success: false,
        error: new Error("Source file not found"),
      });

      const result = await actionExecutor.executeAction(`
        <move_file>
          <source_path>source.txt</source_path>
          <destination_path>dest.txt</destination_path>
        </move_file>
      `);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Source file not found");
    });
  });

  describe("copy_file_slice action", () => {
    it("should handle copy_file action successfully", async () => {
      mockTagsExtractor.extractTag
        .mockReturnValueOnce("source.txt")
        .mockReturnValueOnce("dest.txt");
      mockFileOperations.copy.mockResolvedValue({ success: true });

      const result = await actionExecutor.executeAction(`
        <copy_file_slice>
          <source_path>source.txt</source_path>
          <destination_path>dest.txt</destination_path>
        </copy_file_slice>
      `);

      expect(result.success).toBe(true);
      expect(mockFileOperations.copy).toHaveBeenCalledWith(
        "source.txt",
        "dest.txt",
      );
    });

    it("should handle invalid copy_file format", async () => {
      mockTagsExtractor.extractTag.mockReturnValue(null);
      const result = await actionExecutor.executeAction(
        "<copy_file_slice><source_path>source.txt</source_path></copy_file_slice>",
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(
        "Invalid copy_file format. Must include both <source_path> and <destination_path> tags.",
      );
    });

    it("should handle copy_file failure", async () => {
      mockTagsExtractor.extractTag
        .mockReturnValueOnce("source.txt")
        .mockReturnValueOnce("dest.txt");
      mockFileOperations.copy.mockResolvedValue({
        success: false,
        error: new Error("Destination already exists"),
      });

      const result = await actionExecutor.executeAction(`
        <copy_file_slice>
          <source_path>source.txt</source_path>
          <destination_path>dest.txt</destination_path>
        </copy_file_slice>
      `);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Destination already exists");
    });
  });

  describe("search actions", () => {
    it("should handle search_string action successfully", async () => {
      mockTagsExtractor.extractTag
        .mockReturnValueOnce("./src")
        .mockReturnValueOnce("test");
      const mockResults = [
        {
          path: "test.txt",
          matches: [{ line: 1, content: "test content" }],
        },
      ];
      mockFileSearch.findByContent.mockResolvedValue(mockResults);

      const result = await actionExecutor.executeAction(`
        <search_string>
          <directory>./src</directory>
          <term>test</term>
        </search_string>
      `);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResults);
      expect(mockFileSearch.findByContent).toHaveBeenCalledWith(
        "test",
        "./src",
      );
    });

    it("should handle search_file action successfully", async () => {
      mockTagsExtractor.extractTag
        .mockReturnValueOnce("./src")
        .mockReturnValueOnce("test.txt");
      const mockResults = ["test.txt", "test2.txt"];
      mockFileSearch.findByName.mockResolvedValue(mockResults);

      const result = await actionExecutor.executeAction(`
        <search_file>
          <directory>./src</directory>
          <term>test.txt</term>
        </search_file>
      `);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResults);
      expect(mockFileSearch.findByName).toHaveBeenCalledWith(
        "test.txt",
        "./src",
      );
    });

    it("should handle invalid search format", async () => {
      mockTagsExtractor.extractTag.mockReturnValue(null);
      const result = await actionExecutor.executeAction(
        "<search_string><directory>./src</directory></search_string>",
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(
        "Invalid search format. Must include both <directory> and <term> tags.",
      );
    });

    it("should handle search failure", async () => {
      mockTagsExtractor.extractTag
        .mockReturnValueOnce("./src")
        .mockReturnValueOnce("test");
      mockFileSearch.findByContent.mockRejectedValue(
        new Error("Search failed"),
      );

      const result = await actionExecutor.executeAction(`
        <search_string>
          <directory>./src</directory>
          <term>test</term>
        </search_string>
      `);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Search failed");
    });
  });
});
