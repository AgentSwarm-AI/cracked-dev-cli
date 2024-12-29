import { UnitTestMocker } from "@/jest/mocks/UnitTestMocker";
import { ConfigService } from "@/services/ConfigService";
import { DirectoryScanner } from "@/services/FileManagement/DirectoryScanner";
import { DebugLogger } from "@/services/logging/DebugLogger";
import fs from "fs";
import path from "path";
import { ActionTagsExtractor } from "../ActionTagsExtractor";
import { ListDirectoryFilesAction } from "../ListDirectoryFilesAction";

describe("ListDirectoryFilesAction", () => {
  let action: ListDirectoryFilesAction;
  let mockDirectoryScanner: DirectoryScanner;
  let mocker: UnitTestMocker;
  let mockConfigService: ConfigService;
  let mockActionTagsExtractor: ActionTagsExtractor;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    mocker = new UnitTestMocker();

    // Mock console methods
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    // Mock ConfigService
    mockConfigService = new ConfigService();
    mocker.mockPrototype(ConfigService, "getConfig", {
      directoryScanner: {
        defaultIgnore: [],
        allFiles: true,
        maxDepth: 4,
        directoryFirst: true,
        excludeDirectories: [],
      },
    });

    mockDirectoryScanner = new DirectoryScanner(mockConfigService);

    // Mock filesystem operations
    mocker.mockModule(fs, "statSync", { isDirectory: () => true });
    mocker.mockModule(path, "resolve", (p: string) => p);

    // Mock DirectoryScanner scan method
    mocker.mockPrototype(DirectoryScanner, "scan", {
      success: true,
      data: "file1.txt\nfile2.txt",
    });

    // Mock ActionTagsExtractor
    mockActionTagsExtractor = new ActionTagsExtractor();
    mocker.mockPrototypeWith(
      ActionTagsExtractor,
      "extractTag",
      (content: string, tag: string) => {
        if (tag === "path") {
          if (content.includes("<path>./src1</path><path>./src2</path>")) {
            return ["./src1", "./src2"];
          }
          return "./src";
        }
        if (tag === "recursive") {
          return content.includes("<recursive>true</recursive>")
            ? "true"
            : null;
        }
        return null;
      },
    );

    action = new ListDirectoryFilesAction(
      mockActionTagsExtractor,
      mockDirectoryScanner,
      new DebugLogger(),
    );
  });

  afterEach(() => {
    mocker.clearAllMocks();
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it("should list directory contents successfully", async () => {
    const result = await action.execute(
      "<list_directory_files><path>./src</path></list_directory_files>",
    );

    expect(result.success).toBe(true);
    expect(result.data).toBe("file1.txt\nfile2.txt");
  });

  it("should handle recursive listing", async () => {
    mocker.mockPrototype(DirectoryScanner, "scan", {
      success: true,
      data: "dir1/file1.txt\ndir2/file2.txt",
    });

    const result = await action.execute(
      "<list_directory_files><path>./src</path><recursive>true</recursive></list_directory_files>",
    );

    expect(result.success).toBe(true);
    expect(result.data).toBe("dir1/file1.txt\ndir2/file2.txt");
  });

  it("should handle multiple paths", async () => {
    const scanSpy = mocker.mockPrototypeWith(
      DirectoryScanner,
      "scan",
      async (path: string) => {
        if (path === "./src1") {
          return { success: true, data: "src1/file1.txt\nsrc1/file2.txt" };
        }
        return { success: true, data: "src2/file3.txt\nsrc2/file4.txt" };
      },
    );

    const result = await action.execute(
      "<list_directory_files><path>./src1</path><path>./src2</path></list_directory_files>",
    );

    expect(result.success).toBe(true);
    expect(result.data).toContain("src1/file1.txt");
    expect(result.data).toContain("src1/file2.txt");
    expect(result.data).toContain("src2/file3.txt");
    expect(result.data).toContain("src2/file4.txt");
    expect(scanSpy).toHaveBeenCalledTimes(2);
    expect(scanSpy).toHaveBeenCalledWith("./src1", expect.any(Object));
    expect(scanSpy).toHaveBeenCalledWith("./src2", expect.any(Object));
  });

  it("should handle multiple paths with recursive option", async () => {
    const scanSpy = mocker.mockPrototypeWith(
      DirectoryScanner,
      "scan",
      async (path: string) => {
        if (path === "./src1") {
          return { success: true, data: "src1/deep/file1.txt\nsrc1/file2.txt" };
        }
        return { success: true, data: "src2/deep/file3.txt\nsrc2/file4.txt" };
      },
    );

    const result = await action.execute(
      "<list_directory_files><path>./src1</path><path>./src2</path><recursive>true</recursive></list_directory_files>",
    );

    expect(result.success).toBe(true);
    expect(result.data).toContain("src1/deep/file1.txt");
    expect(result.data).toContain("src1/file2.txt");
    expect(result.data).toContain("src2/deep/file3.txt");
    expect(result.data).toContain("src2/file4.txt");
    expect(scanSpy).toHaveBeenCalledTimes(2);
    expect(scanSpy).toHaveBeenCalledWith(
      "./src1",
      expect.objectContaining({ maxDepth: undefined }),
    );
    expect(scanSpy).toHaveBeenCalledWith(
      "./src2",
      expect.objectContaining({ maxDepth: undefined }),
    );
  });
});
