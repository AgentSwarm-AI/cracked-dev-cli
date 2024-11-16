import { container } from "tsyringe";
import { FileOperations } from "../../FileManagement/FileOperations";
import { ActionExecutor } from "./ActionExecutor";

jest.mock("../../FileManagement/FileOperations");

describe("ActionExecutor", () => {
  let actionExecutor: ActionExecutor;
  let mockFileOperations: jest.Mocked<FileOperations>;

  beforeEach(() => {
    mockFileOperations = container.resolve(
      FileOperations,
    ) as jest.Mocked<FileOperations>;
    actionExecutor = new ActionExecutor(mockFileOperations);
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
  });

  describe("read_file action", () => {
    it("should handle read_file action successfully", async () => {
      mockFileOperations.read.mockResolvedValue({
        success: true,
        data: "file content",
      });

      const result = await actionExecutor.executeAction(
        "<read_file>test.txt</read_file>",
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe("file content");
      expect(mockFileOperations.read).toHaveBeenCalledWith("test.txt");
    });

    it("should handle read_file failure", async () => {
      mockFileOperations.read.mockResolvedValue({
        success: false,
        error: new Error("File not found"),
      });

      const result = await actionExecutor.executeAction(
        "<read_file>test.txt</read_file>",
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("File not found");
    });
  });

  describe("write_file action", () => {
    it("should handle write_file action successfully", async () => {
      mockFileOperations.write.mockResolvedValue({ success: true });

      const action = `
        <write_file>
          <path>test.txt</path>
          <content>Hello World</content>
        </write_file>
      `;

      const result = await actionExecutor.executeAction(action);

      expect(result.success).toBe(true);
      expect(mockFileOperations.write).toHaveBeenCalledWith(
        "test.txt",
        "Hello World",
      );
    });

    it("should handle invalid write_file format", async () => {
      const action = "<write_file><path>test.txt</path></write_file>";
      const result = await actionExecutor.executeAction(action);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(
        "Invalid write_file format. Must include both <path> and <content> tags.",
      );
    });
  });

  describe("delete_file action", () => {
    it("should handle delete_file action successfully", async () => {
      mockFileOperations.delete.mockResolvedValue({ success: true });

      const result = await actionExecutor.executeAction(
        "<delete_file>test.txt</delete_file>",
      );

      expect(result.success).toBe(true);
      expect(mockFileOperations.delete).toHaveBeenCalledWith("test.txt");
    });
  });

  describe("move_file action", () => {
    it("should handle move_file action successfully", async () => {
      mockFileOperations.move.mockResolvedValue({ success: true });

      const action = "<move_file>source.txt\ndest.txt</move_file>";
      const result = await actionExecutor.executeAction(action);

      expect(result.success).toBe(true);
      expect(mockFileOperations.move).toHaveBeenCalledWith(
        "source.txt",
        "dest.txt",
      );
    });

    it("should handle invalid move_file format", async () => {
      const result = await actionExecutor.executeAction(
        "<move_file>source.txt</move_file>",
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Invalid move_file format");
    });
  });

  describe("execute_command action", () => {
    it("should handle execute_command action successfully", async () => {
      const result = await actionExecutor.executeAction(
        "<execute_command>echo test</execute_command>",
      );
      expect(result.success).toBe(true);
    });
  });

  describe("search actions", () => {
    it("should handle search_string action", async () => {
      const result = await actionExecutor.executeAction(
        "<search_string>test</search_string>",
      );
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(
        "Search functionality not implemented yet",
      );
    });

    it("should handle search_file action", async () => {
      const result = await actionExecutor.executeAction(
        "<search_file>test</search_file>",
      );
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(
        "Search functionality not implemented yet",
      );
    });
  });
});
