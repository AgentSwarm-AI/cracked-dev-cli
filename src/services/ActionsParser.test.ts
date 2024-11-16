import { container } from "tsyringe";
import { ActionsParser } from "./ActionsParser";
import { DebugLogger } from "./DebugLogger";
import { LLMContextCreator } from "./LLM/LLMContextCreator";
import { TaskManager } from "./TaskManager/TaskManager";

jest.mock("./DebugLogger");
jest.mock("./LLM/LLMContextCreator");
jest.mock("./TaskManager/TaskManager");

describe("ActionsParser", () => {
  let actionsParser: ActionsParser;
  let mockDebugLogger: jest.Mocked<DebugLogger>;
  let mockContextCreator: jest.Mocked<LLMContextCreator>;
  let mockTaskManager: jest.Mocked<TaskManager>;

  beforeEach(() => {
    mockDebugLogger = container.resolve(
      DebugLogger,
    ) as jest.Mocked<DebugLogger>;
    mockContextCreator = container.resolve(
      LLMContextCreator,
    ) as jest.Mocked<LLMContextCreator>;
    mockTaskManager = container.resolve(
      TaskManager,
    ) as jest.Mocked<TaskManager>;
    actionsParser = new ActionsParser(
      mockDebugLogger,
      mockContextCreator,
      mockTaskManager,
    );
  });

  describe("reset", () => {
    it("should reset all internal states", () => {
      actionsParser.appendToBuffer("test");
      actionsParser.isProcessing = true;
      actionsParser.isComplete = true;

      actionsParser.reset();

      expect(actionsParser.buffer).toBe("");
      expect(actionsParser.isProcessing).toBe(false);
      expect(actionsParser.isComplete).toBe(false);
      expect(mockTaskManager.reset).toHaveBeenCalled();
    });
  });

  describe("isCompleteMessage", () => {
    it("should return true for message with all required sections in order", () => {
      const message = "<strategy>test</strategy><next_step>test</next_step>";
      expect(actionsParser.isCompleteMessage(message)).toBe(true);
    });

    it("should return false for message with missing sections", () => {
      const message = "<strategy>test</strategy>";
      expect(actionsParser.isCompleteMessage(message)).toBe(false);
    });

    it("should return false for message with incorrect order", () => {
      const message = "<next_step>test</next_step><strategy>test</strategy>";
      expect(actionsParser.isCompleteMessage(message)).toBe(false);
    });
  });

  describe("extractFilePath", () => {
    it("should extract file path from valid action tags", () => {
      const tag = "<read_file><path>test/file.txt</path></read_file>";
      expect(actionsParser.extractFilePath(tag)).toBe("test/file.txt");
    });

    it("should return null for invalid action tags", () => {
      const tag = "<invalid_action><path>test/file.txt</path></invalid_action>";
      expect(actionsParser.extractFilePath(tag)).toBeNull();
    });

    it("should return null when path is missing", () => {
      const tag = "<read_file></read_file>";
      expect(actionsParser.extractFilePath(tag)).toBeNull();
    });
  });

  describe("findCompleteTags", () => {
    it("should find all complete action tags", () => {
      const text = `
        <read_file><path>test1.txt</path></read_file>
        <write_file><path>test2.txt</path></write_file>
      `;
      const tags = actionsParser.findCompleteTags(text);
      expect(tags).toHaveLength(2);
      expect(tags[0]).toContain("read_file");
      expect(tags[1]).toContain("write_file");
    });

    it("should not find incomplete tags", () => {
      const text = "<read_file><path>test.txt</path>";
      const tags = actionsParser.findCompleteTags(text);
      expect(tags).toHaveLength(0);
    });

    it("should not return previously processed tags", () => {
      const text = "<read_file><path>test.txt</path></read_file>";
      const firstRun = actionsParser.findCompleteTags(text);
      const secondRun = actionsParser.findCompleteTags(text);
      expect(firstRun).toHaveLength(1);
      expect(secondRun).toHaveLength(0);
    });
  });

  describe("buffer management", () => {
    it("should append to buffer", () => {
      actionsParser.appendToBuffer("test1");
      actionsParser.appendToBuffer("test2");
      expect(actionsParser.buffer).toBe("test1test2");
    });

    it("should clear buffer", () => {
      actionsParser.appendToBuffer("test");
      actionsParser.clearBuffer();
      expect(actionsParser.buffer).toBe("");
    });
  });

  describe("parseAndExecuteActions", () => {
    it("should parse strategy and execute actions", async () => {
      const text =
        "<strategy>test strategy</strategy><next_step>test step</next_step>";
      const mockActions = [{ action: "test", result: "success" }];

      mockContextCreator.parseAndExecuteActions.mockResolvedValueOnce(
        mockActions,
      );
      mockTaskManager.getAllGoals.mockReturnValue([
        { description: "test goal", completed: false },
      ]);
      mockTaskManager.getCurrentGoal.mockReturnValue({
        description: "test goal",
        completed: false,
      });

      const result = await actionsParser.parseAndExecuteActions(
        text,
        "test-model",
        async (msg) => "response",
      );

      expect(mockTaskManager.parseStrategy).toHaveBeenCalledWith(text);
      expect(mockContextCreator.parseAndExecuteActions).toHaveBeenCalledWith(
        text,
      );
      expect(result.actions).toEqual(mockActions);
      expect(result.followupResponse).toBe("response");
    });

    it("should return empty actions when no complete tags found", async () => {
      const text = "no tags here";
      const result = await actionsParser.parseAndExecuteActions(
        text,
        "test-model",
        async (msg) => "response",
      );
      expect(result.actions).toEqual([]);
    });
  });
});
