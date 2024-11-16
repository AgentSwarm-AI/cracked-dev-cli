import { container } from "tsyringe";
import { FileOperations } from "../../FileManagement/FileOperations";
import { FileSearch } from "../../FileManagement/FileSearch";
import { TagsExtractor } from "../../TagsExtractor/TagsExtractor";
import { ActionExecutor } from "./ActionExecutor";

jest.mock("../../FileManagement/FileOperations");
jest.mock("../../FileManagement/FileSearch");
jest.mock("../../TagsExtractor/TagsExtractor");
jest.mock("child_process");

describe("ActionExecutor", () => {
  let actionExecutor: ActionExecutor;
  let mockFileOperations: jest.Mocked<FileOperations>;
  let mockFileSearch: jest.Mocked<FileSearch>;
  let mockTagsExtractor: jest.Mocked<TagsExtractor>;

  beforeEach(() => {
    mockFileOperations = container.resolve(
      FileOperations,
    ) as jest.Mocked<FileOperations>;
    mockFileSearch = container.resolve(FileSearch) as jest.Mocked<FileSearch>;
    mockTagsExtractor = container.resolve(
      TagsExtractor,
    ) as jest.Mocked<TagsExtractor>;
    actionExecutor = new ActionExecutor(
      mockFileOperations,
      mockFileSearch,
      mockTagsExtractor,
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
      mockTagsExtractor.extractTag.mockReturnValue("");
      const result = await actionExecutor.executeAction(
        "<read_file></read_file>",
      );
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(
        "Invalid read_file format. Must include <path> tag.",
      );
    });
  });

  describe("read_file action", () => {
    it("should handle read_file action successfully", async () => {
      mockTagsExtractor.extractTag.mockReturnValue("test.txt");
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

    it("should handle read_file failure", async () => {
      mockTagsExtractor.extractTag.mockReturnValue("test.txt");
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
      mockTagsExtractor.extractTag.mockReturnValue("path with spaces/test.txt");
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
