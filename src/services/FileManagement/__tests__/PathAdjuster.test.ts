// PathAdjuster.test.ts
import { PathAdjuster } from "@services/FileManagement/PathAdjuster";
import { UnitTestMocker } from "@tests/mocks/UnitTestMocker";
import fg from "fast-glob";
import * as fs from "fs-extra";

jest.mock("fs-extra");
jest.mock("fast-glob");

describe("PathAdjuster", () => {
  let pathAdjuster: PathAdjuster;
  let mocker: UnitTestMocker;

  const mockFiles = [
    "/home/joao/projects/cracked-dev-cli/src/file1.ts",
    "/home/joao/projects/cracked-dev-cli/src/components/file2.tsx",
    "/home/joao/projects/cracked-dev-cli/package.json",
  ];

  beforeAll(() => {
    mocker = new UnitTestMocker();

    // Mock fast-glob sync method
    mocker.spyOnModuleFunction(fg, "sync", mockFiles);

    // Mock fs-extra methods
    mocker.spyOnModuleFunction(fs, "pathExistsSync", true);
    mocker.spyOnModuleFunction(fs, "lstatSync", { isFile: () => true });
  });

  afterAll(async () => {
    await pathAdjuster.cleanup();
    mocker.clearAllMocks();
    jest.resetAllMocks();
  });

  beforeEach(() => {
    mocker.clearAllMocks();

    // Reset mocks to default behavior before each test
    (fg.sync as jest.Mock).mockReturnValue(mockFiles);
    (fs.pathExistsSync as jest.Mock).mockReturnValue(true);
    (fs.lstatSync as jest.Mock).mockReturnValue({ isFile: () => true });

    // Instantiate PathAdjuster after setting up mocks
    pathAdjuster = new PathAdjuster();
  });

  afterEach(async () => {
    await pathAdjuster.cleanup();
    mocker.clearAllMocks();
    jest.resetAllMocks();
  });

  describe("initialization", () => {
    it("should initialize successfully", async () => {
      // Wait for async constructor
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(pathAdjuster.isInitialized()).toBe(true);
      expect(pathAdjuster.getInitializationError()).toBeNull();
    });

    it("should handle initialization errors", async () => {
      // Mock fast-glob to throw an error
      (fg.sync as jest.Mock).mockImplementationOnce(() => {
        throw new Error("Mock error");
      });

      // Re-instantiate PathAdjuster to apply new mock
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
      // Mock PathAdjuster's initialized state
      (pathAdjuster as any).initialized = false;
      (pathAdjuster as any).initializationError = new Error("Not initialized");

      expect(() => pathAdjuster.findClosestMatch("any/path")).toThrow(
        "PathAdjuster not initialized. Check initialization status with isInitialized()",
      );
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
      const newMockFiles = ["/home/joao/projects/cracked-dev-cli/new/file.ts"];
      (fg.sync as jest.Mock).mockReturnValueOnce(newMockFiles);
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
      await expect(pathAdjuster.refreshFilePaths()).rejects.toThrow(
        "Refresh error",
      );
    });
  });
});
