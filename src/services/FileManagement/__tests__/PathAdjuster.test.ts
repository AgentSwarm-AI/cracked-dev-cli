import { PathAdjuster } from "@services/FileManagement/PathAdjuster";
import fg from "fast-glob";
import * as fs from "fs-extra";

jest.mock("fs-extra");
jest.mock("fast-glob", () => ({
  sync: jest
    .fn()
    .mockImplementation(() => [
      "/home/joao/projects/cracked-dev-cli/src/file1.ts",
      "/home/joao/projects/cracked-dev-cli/src/components/file2.tsx",
      "/home/joao/projects/cracked-dev-cli/package.json",
    ]),
}));

describe("PathAdjuster", () => {
  let pathAdjuster: PathAdjuster;
  const mockFiles = [
    "/home/joao/projects/cracked-dev-cli/src/file1.ts",
    "/home/joao/projects/cracked-dev-cli/src/components/file2.tsx",
    "/home/joao/projects/cracked-dev-cli/package.json",
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (fs.pathExistsSync as jest.Mock).mockReturnValue(true);
    (fs.lstatSync as jest.Mock).mockReturnValue({ isFile: () => true });
    pathAdjuster = new PathAdjuster();
  });

  afterEach(async () => {
    await pathAdjuster.cleanup();
  });

  describe("initialization", () => {
    it("should initialize successfully", async () => {
      await new Promise((resolve) => setTimeout(resolve, 0)); // Wait for async constructor
      expect(pathAdjuster.isInitialized()).toBe(true);
      expect(pathAdjuster.getInitializationError()).toBeNull();
    });

    it("should handle initialization errors", async () => {
      (fg.sync as jest.Mock).mockImplementationOnce(() => {
        throw new Error("Mock error");
      });
      pathAdjuster = new PathAdjuster();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(pathAdjuster.isInitialized()).toBe(false);
      expect(pathAdjuster.getInitializationError()).toBeTruthy();
    });
  });

  describe("findClosestMatch", () => {
    it("should find closest match for similar path", async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      const result = pathAdjuster.findClosestMatch(
        "/home/joao/projects/cracked-dev-cli/src/file1.tx",
      );
      expect(result).toBe("/home/joao/projects/cracked-dev-cli/src/file1.ts");
    });

    it("should return null for non-matching path", async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      const result = pathAdjuster.findClosestMatch(
        "/completely/different/path.js",
      );
      expect(result).toBeNull();
    });

    it("should throw error if not initialized", () => {
      pathAdjuster = new PathAdjuster();
      expect(() => pathAdjuster.findClosestMatch("any/path")).toThrow();
    });
  });

  describe("validatePath", () => {
    it("should return true for valid file path", () => {
      (fs.pathExistsSync as jest.Mock).mockReturnValue(true);
      (fs.lstatSync as jest.Mock).mockReturnValue({ isFile: () => true });
      expect(pathAdjuster.validatePath("/valid/file.txt")).toBe(true);
    });

    it("should return false for invalid file path", () => {
      (fs.pathExistsSync as jest.Mock).mockReturnValue(false);
      expect(pathAdjuster.validatePath("/invalid/file.txt")).toBe(false);
    });

    it("should return false for directory path", () => {
      (fs.pathExistsSync as jest.Mock).mockReturnValue(true);
      (fs.lstatSync as jest.Mock).mockReturnValue({ isFile: () => false });
      expect(pathAdjuster.validatePath("/some/directory")).toBe(false);
    });
  });

  describe("toRelativePath", () => {
    it("should convert absolute path to relative path", () => {
      const absolutePath = "/home/joao/projects/cracked-dev-cli/src/file1.ts";
      const expected = "src/file1.ts";
      expect(pathAdjuster.toRelativePath(absolutePath)).toBe(expected);
    });

    it("should return existing relative path as-is", () => {
      const relativePath = "src/file1.ts";
      (fs.pathExistsSync as jest.Mock).mockReturnValue(true);
      (fs.lstatSync as jest.Mock).mockReturnValue({ isFile: () => true });
      expect(pathAdjuster.toRelativePath(relativePath)).toBe(relativePath);
    });

    it("should throw error for path outside base directory", () => {
      const outsidePath = "/outside/base/dir/file.ts";
      expect(() => pathAdjuster.toRelativePath(outsidePath)).toThrow(
        "Path is outside the base directory",
      );
    });
  });

  describe("adjustPath", () => {
    it("should find and validate closest matching path", async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      const result = await pathAdjuster.adjustPath(
        "/home/joao/projects/cracked-dev-cli/src/file1.tx",
      );
      expect(result).toBe("/home/joao/projects/cracked-dev-cli/src/file1.ts");
    });

    it("should return null for non-matching path", async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      const result = await pathAdjuster.adjustPath("/no/such/file.js");
      expect(result).toBeNull();
    });
  });

  describe("refreshFilePaths", () => {
    it("should refresh file paths successfully", async () => {
      (fg.sync as jest.Mock).mockImplementationOnce(() => [
        "/home/joao/projects/cracked-dev-cli/new/file.ts",
      ]);
      await pathAdjuster.refreshFilePaths();
      const result = await pathAdjuster.adjustPath(
        "/home/joao/projects/cracked-dev-cli/new/file.ts",
      );
      expect(result).toBe("/home/joao/projects/cracked-dev-cli/new/file.ts");
    });

    it("should handle refresh errors", async () => {
      (fg.sync as jest.Mock).mockImplementationOnce(() => {
        throw new Error("Refresh error");
      });
      await expect(pathAdjuster.refreshFilePaths()).rejects.toThrow();
    });
  });
});
