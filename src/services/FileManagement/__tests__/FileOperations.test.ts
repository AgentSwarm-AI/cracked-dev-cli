import { FileOperations } from "@services/FileManagement/FileOperations";
import { FileSearch } from "@services/FileManagement/FileSearch";
import { PathAdjuster } from "@services/FileManagement/PathAdjuster";
import { DebugLogger } from "@services/logging/DebugLogger";
import fs from "fs-extra";
import path from "path";
import { container } from "tsyringe";
import { UnitTestMocker } from "../../../jest/mocks/UnitTestMocker";

const testDir = path.join(__dirname, "testDir");
const testFile = path.join(testDir, "testFile.txt");
const testContent = "Test file content";

describe("FileOperations.ts", () => {
  let fileOperations: FileOperations;
  let mocker: UnitTestMocker;
  let mockPathAdjuster: jest.Mocked<PathAdjuster>;
  let mockFileSearch: jest.Mocked<FileSearch>;
  let mockDebugLogger: jest.Mocked<DebugLogger>;

  beforeEach(async () => {
    jest.useFakeTimers();
    mocker = new UnitTestMocker();
    mockPathAdjuster = container.resolve(
      PathAdjuster,
    ) as jest.Mocked<PathAdjuster>;
    mockFileSearch = container.resolve(FileSearch) as jest.Mocked<FileSearch>;
    mockDebugLogger = container.resolve(
      DebugLogger,
    ) as jest.Mocked<DebugLogger>;

    // Setup default mocks
    mocker.spyOnPrototypeAndReturn(PathAdjuster, "isInitialized", true);
    mocker.spyOnPrototypeAndReturn(
      PathAdjuster,
      "getInitializationError",
      null,
    );
    mocker.spyOnPrototypeAndReturn(
      PathAdjuster,
      "adjustPath",
      async (filePath: string) => filePath,
    );
    mocker.spyOnPrototypeAndReturn(
      FileSearch,
      "findByName",
      Promise.resolve([]),
    );
    mocker.spyOnPrototypeMethod(DebugLogger, "log");

    // Setup fs-extra mocks
    mocker.spyOnModuleFunction(fs, "pathExists", Promise.resolve(true));
    mocker.spyOnModuleFunction(fs, "readFile", Promise.resolve(testContent));
    mocker.spyOnModuleFunction(fs, "writeFile", Promise.resolve());
    mocker.spyOnModuleFunction(fs, "ensureDir", Promise.resolve());
    mocker.spyOnModuleFunction(fs, "remove", Promise.resolve());
    mocker.spyOnModuleFunction(fs, "copy", Promise.resolve());
    mocker.spyOnModuleFunction(fs, "move", Promise.resolve());
    mocker.spyOnModuleFunction(
      fs,
      "stat",
      Promise.resolve({
        size: 100,
        birthtime: new Date(),
        mtime: new Date(),
        isDirectory: () => false,
      }),
    );

    fileOperations = container.resolve(FileOperations);
  });

  afterEach(() => {
    jest.useRealTimers();
    mocker.clearAllMocks();
    container.clearInstances();
    jest.resetAllMocks(); // Ensure all mocks are reset
  });

  it("should handle PathAdjuster initialization timeout", async () => {
    mocker.spyOnPrototypeAndReturn(PathAdjuster, "isInitialized", false);
    mocker.spyOnPrototypeAndReturn(
      PathAdjuster,
      "getInitializationError",
      new Error("PathAdjuster initialization timed out"),
    );

    const resultPromise = fileOperations.read(testFile);
    jest.runAllTimers();
    const result = await resultPromise;

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe("PathAdjuster initialization timed out");
  }, 10000);

  it("should read a single file correctly", async () => {
    mocker.spyOnModuleFunction(fs, "pathExists", Promise.resolve(true));
    mocker.spyOnModuleFunction(fs, "readFile", Promise.resolve(testContent));

    const result = await fileOperations.read(testFile);

    expect(result.success).toBe(true);
    expect(result.data).toBe(testContent);
    expect(result.error).toBeUndefined();
  });

  describe("readMultiple", () => {
    const testFile2 = path.join(testDir, "testFile2.txt");
    const testContent2 = "Second file content";

    it("should read multiple files correctly", async () => {
      let fileCount = 0;
      mocker.spyOnModuleFunction(fs, "pathExists", Promise.resolve(true));
      mocker.spyOnModuleFunction(fs, "readFile", () => {
        return Promise.resolve(fileCount++ === 0 ? testContent : testContent2);
      });

      const result = await fileOperations.readMultiple([testFile, testFile2]);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should handle errors when reading non-existent files", async () => {
      const nonExistentFile = path.join(testDir, "nonexistent.txt");

      // Use jest.spyOn directly to mock pathExists with conditional logic
      const pathExistsMock = jest
        .spyOn(fs, "pathExists")
        .mockImplementation((filePath: string) => {
          if (filePath === testFile) return Promise.resolve(true);
          if (filePath === nonExistentFile) return Promise.resolve(false);
          return Promise.resolve(false);
        });

      // Ensure FileSearch.findByName returns an empty array
      mocker.spyOnPrototypeAndReturn(
        FileSearch,
        "findByName",
        Promise.resolve([]),
      );

      mocker.spyOnPrototypeAndReturn(
        PathAdjuster,
        "adjustPath",
        async (filePath: string) => filePath,
      );

      const result = await fileOperations.readMultiple([
        testFile,
        nonExistentFile,
      ]);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("Failed to read files");
      expect(result.error?.message).toContain(nonExistentFile);

      // Restore the original implementation
      pathExistsMock.mockRestore();
    });

    it("should handle empty file list", async () => {
      const result = await fileOperations.readMultiple([]);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("No files provided");
    });
  });

  it("should write to a file successfully", async () => {
    const content = "New content";
    mocker.spyOnModuleFunction(fs, "writeFile", Promise.resolve());

    const result = await fileOperations.write(testFile, content);

    expect(result.success).toBe(true);
  });

  it("should delete a file successfully", async () => {
    mocker.spyOnModuleFunction(fs, "pathExists", Promise.resolve(true));
    mocker.spyOnModuleFunction(fs, "remove", Promise.resolve());

    const result = await fileOperations.delete(testFile);

    expect(result.success).toBe(true);
  });

  it("should copy a file successfully", async () => {
    const destFile = path.join(testDir, "dest.txt");
    mocker.spyOnModuleFunction(fs, "pathExists", Promise.resolve(true));
    mocker.spyOnModuleFunction(fs, "copy", Promise.resolve());

    const result = await fileOperations.copy(testFile, destFile);

    expect(result.success).toBe(true);
  });

  it("should move a file successfully", async () => {
    const destFile = path.join(testDir, "dest.txt");
    mocker.spyOnModuleFunction(fs, "pathExists", Promise.resolve(true));
    mocker.spyOnModuleFunction(fs, "move", Promise.resolve());

    const result = await fileOperations.move(testFile, destFile);

    expect(result.success).toBe(true);
  });

  it("should check if a file exists", async () => {
    mocker.spyOnModuleFunction(fs, "pathExists", Promise.resolve(true));

    const result = await fileOperations.exists(testFile);

    expect(result).toBe(true);
  });

  it("should get file stats successfully", async () => {
    const stats = {
      size: 100,
      birthtime: new Date(),
      mtime: new Date(),
      isDirectory: () => false,
    };
    mocker.spyOnModuleFunction(fs, "pathExists", Promise.resolve(true));
    mocker.spyOnModuleFunction(fs, "stat", Promise.resolve(stats));

    const result = await fileOperations.stats(testFile);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      isDirectory: false,
      path: testFile,
    });
  });
});
