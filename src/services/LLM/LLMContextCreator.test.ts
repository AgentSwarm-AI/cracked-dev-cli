import { container } from "tsyringe";
import { ActionExecutor } from "../ActionExecutor/ActionExecutor";
import { DirectoryScanner } from "../FileManagement/DirectoryScanner";
import { TaskStage } from "../TaskManager/TaskStage";
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

    container.registerInstance(DirectoryScanner, mockDirectoryScanner);
    container.registerInstance(ActionExecutor, mockActionExecutor);
    llmContextCreator = container.resolve(LLMContextCreator);
  });

  describe("create", () => {
    const mockScanResult = {
      success: true,
      data: "mock-file-list",
    };

    beforeEach(() => {
      mockDirectoryScanner.scan.mockResolvedValue(mockScanResult);
    });

    it("should create first-time message context with discovery stage and environment details", async () => {
      const message = "test message";
      const root = "/test/root";
      const stagePrompt = "discovery stage prompt";

      const result = await llmContextCreator.create(
        message,
        root,
        true,
        TaskStage.DISCOVERY,
        stagePrompt,
      );

      expect(mockDirectoryScanner.scan).toHaveBeenCalledWith(root);
      expect(result).toContain("<task>\n  test message\n</task>");
      expect(result).toContain("<environment>");
      expect(result).toContain(mockScanResult.data);
      expect(result).toContain(stagePrompt);
    });

    it("should create first-time message context with strategy stage and environment details", async () => {
      const message = "test message";
      const root = "/test/root";
      const stagePrompt = "strategy stage prompt";

      const result = await llmContextCreator.create(
        message,
        root,
        true,
        TaskStage.STRATEGY,
        stagePrompt,
      );

      expect(mockDirectoryScanner.scan).toHaveBeenCalledWith(root);
      expect(result).toContain("<task>\n  test message\n</task>");
      expect(result).toContain("<environment>");
      expect(result).toContain(mockScanResult.data);
      expect(result).toContain(stagePrompt);
    });

    it("should create sequential message context without environment details", async () => {
      const message = "follow-up message";
      const root = "/test/root";

      const result = await llmContextCreator.create(message, root, false);

      expect(mockDirectoryScanner.scan).not.toHaveBeenCalled();
      expect(result).toContain("<task>\n  follow-up message\n</task>");
      expect(result).not.toContain("<environment>");
      expect(result).not.toContain(mockScanResult.data);
      expect(result).not.toContain("<strategy>");
    });

    it("should throw error when directory scan fails on first message", async () => {
      const errorMessage = "Scan failed";
      mockDirectoryScanner.scan.mockResolvedValue({
        success: false,
        error: errorMessage,
      } as any);

      await expect(async () => {
        await llmContextCreator.create("test", "/root", true);
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
