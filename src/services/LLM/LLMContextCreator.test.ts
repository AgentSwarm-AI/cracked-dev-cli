import { ActionExecutor } from "../ActionExecutor/ActionExecutor";
import { DirectoryScanner } from "../FileManagement/DirectoryScanner";
import { LLMContextCreator } from "./LLMContextCreator";

describe("LLMContextCreator", () => {
  let llmContextCreator: LLMContextCreator;
  let mockDirectoryScanner: jest.Mocked<DirectoryScanner>;
  let mockActionExecutor: jest.Mocked<ActionExecutor>;

  beforeEach(() => {
    mockDirectoryScanner = {
      scan: jest.fn(),
    } as any;

    mockActionExecutor = {
      executeAction: jest.fn(),
    } as any;

    llmContextCreator = new LLMContextCreator(
      mockDirectoryScanner,
      mockActionExecutor,
    );
  });

  describe("create", () => {
    const mockScanResult = {
      success: true,
      data: "mock-file-list",
    };

    beforeEach(() => {
      mockDirectoryScanner.scan.mockResolvedValue(mockScanResult);
    });

    it("should create first-time message context with strategy section", async () => {
      const message = "test message";
      const root = "/test/root";

      const result = await llmContextCreator.create(message, root, true);

      expect(mockDirectoryScanner.scan).toHaveBeenCalledWith(root);
      expect(result).toContain("<task>\n  test message\n</task>");
      expect(result).toContain("<strategy>");
      expect(result).toContain("<environment>");
      expect(result).toContain(mockScanResult.data);
    });

    it("should create sequential message context without strategy section", async () => {
      const message = "follow-up message";
      const root = "/test/root";

      const result = await llmContextCreator.create(message, root, false);

      expect(mockDirectoryScanner.scan).toHaveBeenCalledWith(root);
      expect(result).toContain("<task>\n  follow-up message\n</task>");
      expect(result).not.toContain("<strategy>");
      expect(result).toContain("<environment>");
      expect(result).toContain(mockScanResult.data);
    });

    it("should throw error when directory scan fails", async () => {
      const errorMessage = "Scan failed";
      mockDirectoryScanner.scan.mockResolvedValue({
        success: false,
        error: errorMessage as any,
      });

      await expect(async () => {
        await llmContextCreator.create("test", "/root");
      }).rejects.toThrowError(`Failed to scan directory: ${errorMessage}`);
    });
  });

  describe("parseAndExecuteActions", () => {
    it("should parse and execute actions from response", async () => {
      const mockResponse = `
        <read_file>test.txt</read_file>
        <write_file>output.txt</write_file>
      `;
      const mockResult1 = { success: true, data: "file content" };
      const mockResult2 = { success: true };

      mockActionExecutor.executeAction
        .mockResolvedValueOnce(mockResult1)
        .mockResolvedValueOnce(mockResult2);

      const results =
        await llmContextCreator.parseAndExecuteActions(mockResponse);

      expect(results).toHaveLength(2);
      expect(mockActionExecutor.executeAction).toHaveBeenCalledTimes(2);
      expect(results[0].result).toEqual(mockResult1);
      expect(results[1].result).toEqual(mockResult2);
    });

    it("should handle response with no actions", async () => {
      const mockResponse = "No actions here";

      const results =
        await llmContextCreator.parseAndExecuteActions(mockResponse);

      expect(results).toHaveLength(0);
      expect(mockActionExecutor.executeAction).not.toHaveBeenCalled();
    });
  });
});
