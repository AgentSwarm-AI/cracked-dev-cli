import { ReadDirectoryAction } from "../ReadDirectoryAction";
import { ActionTagsExtractor } from "../ActionTagsExtractor";
import { DirectoryScanner } from "@services/FileManagement/DirectoryScanner";
import { FileReader } from "@services/FileManagement/FileReader";
import { ConfigService } from "@services/ConfigService";

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
    it("should fail when no directory is provided", async () => {
      mockActionTagsExtractor.extractTag.mockReturnValue(null);
      const actionContent = "<read_directory></read_directory>";
      const result = await readDirectoryAction.execute(actionContent);
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("No directory provided");
    });

    it("should fail when directory is empty", async () => {
      const actionContent =
        "<read_directory><directory></directory></read_directory>";

      mockActionTagsExtractor.extractTag.mockReturnValue("");

      const result = await readDirectoryAction.execute(actionContent);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("No directory provided");
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

      // Add this line to mock extractTag
      mockActionTagsExtractor.extractTag.mockReturnValue(directory);

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

      const content = `<read_directory><directory>${directory}</directory></read_directory>`;

      const result = await readDirectoryAction.execute(content);

      expect(mockDirectoryScanner.scan).toHaveBeenCalledWith(directory);
      expect(mockFileReader.readFile).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(fileContents);
    });

    it("should handle scanner failure", async () => {
      const directory = "/test/directory";

      // Add this line to mock extractTag
      mockActionTagsExtractor.extractTag.mockReturnValue(directory);

      mockDirectoryScanner.scan.mockResolvedValue({
        success: false,
        error: new Error("Scan failed"),
      });

      const content = `<read_directory><directory>${directory}</directory></read_directory>`;

      const result = await readDirectoryAction.execute(content);

      expect(mockDirectoryScanner.scan).toHaveBeenCalledWith(directory);
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(
        "Failed to scan directory: Scan failed",
      );
    });

    it("should handle file read failure gracefully", async () => {
      const directory = "/test/directory";
      const filePaths = "/test/directory/file1.txt\n/test/directory/file2.txt";

      // Mock extractTag to return the directory
      mockActionTagsExtractor.extractTag.mockReturnValue(directory);

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

      const content = `<read_directory><directory>${directory}</directory></read_directory>`;

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
