import { DirectoryScanner } from "@/services/FileManagement/DirectoryScanner";
import { ListDirectoryFilesAction } from "../ListDirectoryFilesAction";
import { ActionTagsExtractor } from "../ActionTagsExtractor";
import { DebugLogger } from "@/services/logging/DebugLogger";

describe("ListDirectoryFilesAction", () => {
  let action: ListDirectoryFilesAction;
  let mockDirectoryScanner: jest.Mocked<DirectoryScanner>;

  beforeEach(() => {
    mockDirectoryScanner = {
      scan: jest.fn(),
    } as any;

    action = new ListDirectoryFilesAction(
      new ActionTagsExtractor(),
      mockDirectoryScanner,
      new DebugLogger(),
    );
  });

  it("should list directory contents successfully", async () => {
    mockDirectoryScanner.scan.mockResolvedValue({
      success: true,
      data: "file1.txt\nfile2.txt",
    });

    const result = await action.execute(
      "<list_directory_files><path>./src</path></list_directory_files>",
    );

    expect(result.success).toBe(true);
    expect(result.data).toBe("file1.txt\nfile2.txt");
  });

  it("should handle recursive listing", async () => {
    mockDirectoryScanner.scan.mockResolvedValue({
      success: true,
      data: "dir1/file1.txt\ndir2/file2.txt",
    });

    const result = await action.execute(
      "<list_directory_files><path>./src</path><recursive>true</recursive></list_directory_files>",
    );

    expect(result.success).toBe(true);
    expect(mockDirectoryScanner.scan).toHaveBeenCalledWith(
      "./src",
      expect.objectContaining({ maxDepth: undefined }),
    );
  });
});
