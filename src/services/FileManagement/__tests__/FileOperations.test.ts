import fs from "fs-extra";
import path from "path";
import { FileOperations } from "../FileOperations";

jest.mock("fs-extra");

describe("FileOperations", () => {
  let fileOperations: FileOperations;

  beforeEach(() => {
    fileOperations = new FileOperations();
  });

  describe("read", () => {
    it("should read a file successfully", async () => {
      const mockFilePath = "/path/to/file";
      const mockFileContent = "file content";
      (fs.readFile as unknown as jest.Mock).mockResolvedValue(mockFileContent);

      const result = await fileOperations.read(mockFilePath);

      expect(fs.readFile).toHaveBeenCalledWith(mockFilePath, "utf-8");
      expect(result).toEqual({ success: true, data: mockFileContent });
    });

    it("should handle read errors", async () => {
      const mockFilePath = "/path/to/file";
      const mockError = new Error("Failed to read file");
      (fs.readFile as unknown as jest.Mock).mockRejectedValue(mockError);

      const result = await fileOperations.read(mockFilePath);

      expect(fs.readFile).toHaveBeenCalledWith(mockFilePath, "utf-8");
      expect(result).toEqual({ success: false, error: mockError });
    });
  });

  describe("write", () => {
    it("should write to a file successfully", async () => {
      const mockFilePath = "/path/to/file";
      const mockContent = "file content";
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as unknown as jest.Mock).mockResolvedValue(undefined);

      const result = await fileOperations.write(mockFilePath, mockContent);

      expect(fs.ensureDir).toHaveBeenCalledWith(path.dirname(mockFilePath));
      expect(fs.writeFile).toHaveBeenCalledWith(mockFilePath, mockContent);
      expect(result).toEqual({ success: true });
    });

    it("should handle write errors", async () => {
      const mockFilePath = "/path/to/file";
      const mockContent = "file content";
      const mockError = new Error("Failed to write file");
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as unknown as jest.Mock).mockRejectedValue(mockError);

      const result = await fileOperations.write(mockFilePath, mockContent);

      expect(fs.ensureDir).toHaveBeenCalledWith(path.dirname(mockFilePath));
      expect(fs.writeFile).toHaveBeenCalledWith(mockFilePath, mockContent);
      expect(result).toEqual({ success: false, error: mockError });
    });
  });

  describe("delete", () => {
    it("should delete a file successfully", async () => {
      const mockFilePath = "/path/to/file";
      (fs.remove as jest.Mock).mockResolvedValue(undefined);

      const result = await fileOperations.delete(mockFilePath);

      expect(fs.remove).toHaveBeenCalledWith(mockFilePath);
      expect(result).toEqual({ success: true });
    });

    it("should handle delete errors", async () => {
      const mockFilePath = "/path/to/file";
      const mockError = new Error("Failed to delete file");
      (fs.remove as jest.Mock).mockRejectedValue(mockError);

      const result = await fileOperations.delete(mockFilePath);

      expect(fs.remove).toHaveBeenCalledWith(mockFilePath);
      expect(result).toEqual({ success: false, error: mockError });
    });
  });

  describe("copy", () => {
    it("should copy a file successfully", async () => {
      const mockSource = "/path/to/source";
      const mockDestination = "/path/to/destination";
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      (fs.copy as jest.Mock).mockResolvedValue(undefined);

      const result = await fileOperations.copy(mockSource, mockDestination);

      expect(fs.ensureDir).toHaveBeenCalledWith(path.dirname(mockDestination));
      expect(fs.copy).toHaveBeenCalledWith(mockSource, mockDestination);
      expect(result).toEqual({ success: true });
    });

    it("should handle copy errors", async () => {
      const mockSource = "/path/to/source";
      const mockDestination = "/path/to/destination";
      const mockError = new Error("Failed to copy file");
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      (fs.copy as jest.Mock).mockRejectedValue(mockError);

      const result = await fileOperations.copy(mockSource, mockDestination);

      expect(fs.ensureDir).toHaveBeenCalledWith(path.dirname(mockDestination));
      expect(fs.copy).toHaveBeenCalledWith(mockSource, mockDestination);
      expect(result).toEqual({ success: false, error: mockError });
    });
  });

  describe("move", () => {
    it("should move a file successfully", async () => {
      const mockSource = "/path/to/source";
      const mockDestination = "/path/to/destination";
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      (fs.move as jest.Mock).mockResolvedValue(undefined);

      const result = await fileOperations.move(mockSource, mockDestination);

      expect(fs.ensureDir).toHaveBeenCalledWith(path.dirname(mockDestination));
      expect(fs.move).toHaveBeenCalledWith(mockSource, mockDestination);
      expect(result).toEqual({ success: true });
    });

    it("should handle move errors", async () => {
      const mockSource = "/path/to/source";
      const mockDestination = "/path/to/destination";
      const mockError = new Error("Failed to move file");
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      (fs.move as jest.Mock).mockRejectedValue(mockError);

      const result = await fileOperations.move(mockSource, mockDestination);

      expect(fs.ensureDir).toHaveBeenCalledWith(path.dirname(mockDestination));
      expect(fs.move).toHaveBeenCalledWith(mockSource, mockDestination);
      expect(result).toEqual({ success: false, error: mockError });
    });
  });

  describe("exists", () => {
    it("should check if a file exists", async () => {
      const mockFilePath = "/path/to/file";
      (fs.pathExists as jest.Mock).mockResolvedValue(true);

      const result = await fileOperations.exists(mockFilePath);

      expect(fs.pathExists).toHaveBeenCalledWith(mockFilePath);
      expect(result).toBe(true);
    });

    it("should handle non-existent files", async () => {
      const mockFilePath = "/path/to/file";
      (fs.pathExists as jest.Mock).mockResolvedValue(false);

      const result = await fileOperations.exists(mockFilePath);

      expect(fs.pathExists).toHaveBeenCalledWith(mockFilePath);
      expect(result).toBe(false);
    });
  });

  describe("stats", () => {
    it("should return file stats successfully", async () => {
      const mockFilePath = "/path/to/file";
      const mockFileStats = {
        data: {
          size: 1024,
          createdAt: new Date(),
          modifiedAt: new Date(),
          isDirectory: false,
          path: mockFilePath,
        },
        success: true,
      };
      (fs.stat as unknown as jest.Mock).mockResolvedValue({
        size: mockFileStats.data.size,
        birthtime: mockFileStats.data.createdAt,
        mtime: mockFileStats.data.modifiedAt,
        isDirectory: () => mockFileStats.data.isDirectory,
      });

      const result = await fileOperations.stats(mockFilePath);

      expect(fs.stat).toHaveBeenCalledWith(mockFilePath);
      expect(result).toEqual(mockFileStats);
    });

    it("should handle stats errors", async () => {
      const mockFilePath = "/path/to/file";
      const mockError = new Error("Failed to get file stats");
      (fs.stat as unknown as jest.Mock).mockRejectedValue(mockError);

      const result = await fileOperations.stats(mockFilePath);

      expect(fs.stat).toHaveBeenCalledWith(mockFilePath);
      expect(result).toEqual({ success: false, error: mockError });
    });
  });
});
