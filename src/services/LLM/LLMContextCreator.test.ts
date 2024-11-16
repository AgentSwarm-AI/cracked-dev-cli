import { container } from "tsyringe";
import { DirectoryScanner } from "../FileManagement/DirectoryScanner";
import { TaskStage } from "../TaskManager/TaskStage";
import { ActionExecutor } from "./actions/ActionExecutor";
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
    const mockTask = "test task";
    const mockRoot = "/test/root";
    const mockScanResult = {
      success: true,
      data: "file1\nfile2",
    };

    beforeEach(() => {
      mockDirectoryScanner.scan.mockResolvedValue(mockScanResult);
    });

    it("should include environment details for first message", async () => {
      const result = await llmContextCreator.create(mockTask, mockRoot, true);

      expect(result).toContain("<environment>");
      expect(result).toContain(mockScanResult.data);
      expect(mockDirectoryScanner.scan).toHaveBeenCalledWith(mockRoot);
    });

    it("should not include environment details for sequential messages", async () => {
      const result = await llmContextCreator.create(mockTask, mockRoot, false);

      expect(result).not.toContain("<environment>");
      expect(mockDirectoryScanner.scan).not.toHaveBeenCalled();
    });

    it("should include strategy template for first message in STRATEGY stage", async () => {
      const result = await llmContextCreator.create(
        mockTask,
        mockRoot,
        true,
        TaskStage.STRATEGY,
      );

      expect(result).toContain("<strategy>");
      expect(result).toContain("<goal>");
      expect(result).toContain("<description>");
      expect(result).toContain("<steps>");
      expect(result).toContain("<considerations>");
    });

    it("should include strategy template for sequential messages in STRATEGY stage", async () => {
      const result = await llmContextCreator.create(
        mockTask,
        mockRoot,
        false,
        TaskStage.STRATEGY,
      );

      expect(result).toContain("<strategy>");
      expect(result).toContain("<goal>");
      expect(result).toContain("<description>");
      expect(result).toContain("<steps>");
      expect(result).toContain("<considerations>");
    });

    it("should not include strategy template for non-STRATEGY stages", async () => {
      const discoveryResult = await llmContextCreator.create(
        mockTask,
        mockRoot,
        true,
        TaskStage.DISCOVERY,
      );
      const executionResult = await llmContextCreator.create(
        mockTask,
        mockRoot,
        true,
        TaskStage.EXECUTION,
      );
      const verificationResult = await llmContextCreator.create(
        mockTask,
        mockRoot,
        true,
        TaskStage.VERIFICATION,
      );

      expect(discoveryResult).not.toContain("<strategy>");
      expect(executionResult).not.toContain("<strategy>");
      expect(verificationResult).not.toContain("<strategy>");
    });
  });

  describe("parseAndExecuteActions", () => {
    it("should parse and execute actions from response", async () => {
      const mockResponse = `
        <read_file>test.txt</read_file>
        <execute_command>ls</execute_command>
      `;
      const mockResult = { success: true };
      mockActionExecutor.executeAction.mockResolvedValue(mockResult);

      const results =
        await llmContextCreator.parseAndExecuteActions(mockResponse);

      expect(results).toHaveLength(2);
      expect(mockActionExecutor.executeAction).toHaveBeenCalledTimes(2);
      expect(results[0].result).toEqual(mockResult);
      expect(results[1].result).toEqual(mockResult);
    });

    it("should handle responses with no actions", async () => {
      const mockResponse = "No actions here";
      const results =
        await llmContextCreator.parseAndExecuteActions(mockResponse);

      expect(results).toHaveLength(0);
      expect(mockActionExecutor.executeAction).not.toHaveBeenCalled();
    });
  });
});
