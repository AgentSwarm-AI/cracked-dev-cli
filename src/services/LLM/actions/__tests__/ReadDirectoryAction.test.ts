import { ConfigService } from "@services/ConfigService";
import { DirectoryScanner } from "@services/FileManagement/DirectoryScanner";
import { FileReader } from "@services/FileManagement/FileReader";
import { ActionTagsExtractor } from "../ActionTagsExtractor";
import { ReadDirectoryAction } from "../ReadDirectoryAction";

jest.mock("@services/FileManagement/DirectoryScanner");
jest.mock("@services/FileManagement/FileReader");
jest.mock("../ActionTagsExtractor");

describe("ReadDirectoryAction", () => {
  let readDirectoryAction: ReadDirectoryAction;
  let mockActionTagsExtractor: jest.Mocked<ActionTagsExtractor>;
  let mockDirectoryScanner: jest.Mocked<DirectoryScanner>;
  let mockFileReader: jest.Mocked<FileReader>;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock ActionTagsExtractor
    mockActionTagsExtractor = {
      extractTag: jest.fn(),
    } as unknown as jest.Mocked<ActionTagsExtractor>;

    // Mock ConfigService
    mockConfigService = {
      getConfig: jest.fn().mockReturnValue({
        directoryScanner: {
          defaultIgnore: [],
          allFiles: true,
          maxDepth: 4,
          directoryFirst: true,
          excludeDirectories: [],
        },
      }),
    } as unknown as jest.Mocked<ConfigService>;

    // Mock DirectoryScanner
    mockDirectoryScanner = {
      scan: jest.fn(),
    } as unknown as jest.Mocked<DirectoryScanner>;

    // Mock FileReader
    mockFileReader = {
      readFile: jest.fn(),
    } as unknown as jest.Mocked<FileReader>;

    // Create instance with mocked dependencies
    readDirectoryAction = new ReadDirectoryAction(
      mockActionTagsExtractor,
      mockDirectoryScanner,
      mockFileReader,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("blueprint", () => {
    it("should return the correct blueprint", () => {
      const blueprint = (readDirectoryAction as any).getBlueprint();
      expect(blueprint.tag).toBe("read_directory");
    });
  });

  describe("parameter validation", () => {
    it("should fail when no path is provided", async () => {
      mockActionTagsExtractor.extractTag.mockReturnValue(null);
      const actionContent = "<read_directory></read_directory>";
      const result = await readDirectoryAction.execute(actionContent);
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain(
        "Must include at least one <path> tag",
      );
    });

    it("should fail when path is empty", async () => {
      const actionContent = "<read_directory><path></path></read_directory>";

      mockActionTagsExtractor.extractTag.mockReturnValue("");

      const result = await readDirectoryAction.execute(actionContent);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("Invalid paths found");
    });
  });

  describe("directory handling", () => {
    it("should read directory and process files successfully", async () => {
      const directory = "/test/directory";
      const filePaths = "/test/directory/file1.txt\n/test/directory/file2.txt";
      const fileContents = [
        { path: "/test/directory/file1.txt", content: "Content of file1" },
        { path: "/test/directory/file2.txt", content: "Content of file2" },
      ];

      // Mock extractTag to return array of paths
      mockActionTagsExtractor.extractTag.mockReturnValue([directory]);

      mockDirectoryScanner.scan.mockResolvedValue({
        success: true,
        data: filePaths,
      });

      mockFileReader.readFile.mockImplementation(async (filePath: string) => {
        const file = fileContents.find((f) => f.path === filePath);
        if (file) {
          return { success: true, data: file.content };
        }
        return { success: false, error: new Error("File not found") };
      });

      const content = `<read_directory><path>${directory}</path></read_directory>`;

      const result = await readDirectoryAction.execute(content);

      expect(mockDirectoryScanner.scan).toHaveBeenCalledWith(directory);
      expect(mockFileReader.readFile).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(fileContents);
    });

    it("should read multiple directories and combine results", async () => {
      const directories = ["/test/dir1", "/test/dir2"];
      const filePathsDir1 = "/test/dir1/file1.txt\n/test/dir1/file2.txt";
      const filePathsDir2 = "/test/dir2/file3.txt\n/test/dir2/file4.txt";
      const fileContents = [
        { path: "/test/dir1/file1.txt", content: "Content of file1" },
        { path: "/test/dir1/file2.txt", content: "Content of file2" },
        { path: "/test/dir2/file3.txt", content: "Content of file3" },
        { path: "/test/dir2/file4.txt", content: "Content of file4" },
      ];

      // Mock extractTag to return array of paths
      mockActionTagsExtractor.extractTag.mockReturnValue(directories);

      // Mock directory scanner to return different files for each directory
      mockDirectoryScanner.scan.mockImplementation(async (dir: string) => ({
        success: true,
        data: dir === "/test/dir1" ? filePathsDir1 : filePathsDir2,
      }));

      // Mock file reader to return content based on file path
      mockFileReader.readFile.mockImplementation(async (filePath: string) => {
        const file = fileContents.find((f) => f.path === filePath);
        if (file) {
          return { success: true, data: file.content };
        }
        return { success: false, error: new Error("File not found") };
      });

      const content = `<read_directory>
        <path>${directories[0]}</path>
        <path>${directories[1]}</path>
      </read_directory>`;

      const result = await readDirectoryAction.execute(content);

      // Verify scanner was called for each directory
      expect(mockDirectoryScanner.scan).toHaveBeenCalledTimes(2);
      expect(mockDirectoryScanner.scan).toHaveBeenCalledWith(directories[0]);
      expect(mockDirectoryScanner.scan).toHaveBeenCalledWith(directories[1]);

      // Verify file reader was called for each file
      expect(mockFileReader.readFile).toHaveBeenCalledTimes(4);

      // Verify combined results
      expect(result.success).toBe(true);
      expect(result.data).toEqual(fileContents);
    });

    it("should handle scanner failure", async () => {
      const directory = "/test/directory";

      // Mock extractTag to return array of paths
      mockActionTagsExtractor.extractTag.mockReturnValue([directory]);

      mockDirectoryScanner.scan.mockResolvedValue({
        success: false,
        error: new Error("Scan failed"),
      });

      const content = `<read_directory><path>${directory}</path></read_directory>`;

      const result = await readDirectoryAction.execute(content);

      expect(mockDirectoryScanner.scan).toHaveBeenCalledWith(directory);
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("Failed to scan directory");
    });

    it("should handle file read failure gracefully", async () => {
      const directory = "/test/directory";
      const filePaths = "/test/directory/file1.txt\n/test/directory/file2.txt";

      // Mock extractTag to return array of paths
      mockActionTagsExtractor.extractTag.mockReturnValue([directory]);

      mockDirectoryScanner.scan.mockResolvedValue({
        success: true,
        data: filePaths,
      });

      mockFileReader.readFile.mockImplementation(async (filePath: string) => {
        if (filePath === "/test/directory/file1.txt") {
          return { success: true, data: "Content of file1" };
        } else {
          return { success: false, error: new Error("Read failed") };
        }
      });

      const content = `<read_directory><path>${directory}</path></read_directory>`;

      const result = await readDirectoryAction.execute(content);

      expect(mockDirectoryScanner.scan).toHaveBeenCalledWith(directory);
      expect(mockFileReader.readFile).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
      expect(result.data).toEqual([
        { path: "/test/directory/file1.txt", content: "Content of file1" },
      ]);
    });
  });
});
