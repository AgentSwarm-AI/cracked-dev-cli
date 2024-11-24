import { FileOperations } from "@services/FileManagement/FileOperations";
import { ActionTagsExtractor } from "../ActionTagsExtractor";
import { DeleteFileAction } from "../DeleteFileAction";

describe("DeleteFileAction", () => {
  let deleteFileAction: DeleteFileAction;
  let fileOperationsMock: jest.Mocked<FileOperations>;
  let actionTagsExtractorMock: jest.Mocked<ActionTagsExtractor>;

  beforeEach(() => {
    fileOperationsMock = {
      delete: jest.fn(),
    } as unknown as jest.Mocked<FileOperations>;
    actionTagsExtractorMock = {
      extractTags: jest.fn(),
    } as unknown as jest.Mocked<ActionTagsExtractor>;
    deleteFileAction = new DeleteFileAction(
      actionTagsExtractorMock,
      fileOperationsMock,
    );
  });

  it("should return an error if no file path is provided", async () => {
    const params = JSON.stringify({});
    const result = await deleteFileAction.execute(params);
    expect(result.success).toBe(false);
    expect(result.error?.message).toBe("Invalid or no file path provided");
  });

  it("should return an error if the file path is invalid", async () => {
    const params = JSON.stringify({ path: "" });
    const result = await deleteFileAction.execute(params);
    expect(result.success).toBe(false);
    expect(result.error?.message).toBe("Invalid or no file path provided");
  });

  it("should return an error if the file does not exist", async () => {
    const params = JSON.stringify({ path: "nonexistentfile.txt" });
    fileOperationsMock.delete.mockResolvedValue({
      success: false,
      error: new Error("File does not exist"),
    });
    const result = await deleteFileAction.execute(params);
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe("File does not exist");
  });

  it("should delete the file successfully if it exists", async () => {
    const params = JSON.stringify({ path: "existingfile.txt" });
    fileOperationsMock.delete.mockResolvedValue({
      success: true,
      data: "File deleted successfully",
    });
    const result = await deleteFileAction.execute(params);
    expect(result.success).toBe(true);
    expect(result.data).toBe("File deleted successfully");
  });

  it("should return an error if an error occurs during file deletion", async () => {
    const params = JSON.stringify({ path: "existingfile.txt" });
    fileOperationsMock.delete.mockResolvedValue({
      success: false,
      error: new Error("Deletion failed"),
    });
    const result = await deleteFileAction.execute(params);
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe("Deletion failed");
  });
});
