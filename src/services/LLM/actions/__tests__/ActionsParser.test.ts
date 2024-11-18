import { container } from "tsyringe";
import { DebugLogger } from "../../../logging/DebugLogger";
import { LLMContextCreator } from "../../LLMContextCreator";
import { ActionsParser } from "../ActionsParser";

jest.mock("../../../logging/DebugLogger");
jest.mock("../../LLMContextCreator");

describe("ActionsParser", () => {
  let actionsParser: ActionsParser;
  let mockDebugLogger: jest.Mocked<DebugLogger>;
  let mockContextCreator: jest.Mocked<LLMContextCreator>;

  beforeEach(() => {
    mockDebugLogger = container.resolve(
      DebugLogger,
    ) as jest.Mocked<DebugLogger>;
    mockContextCreator = container.resolve(
      LLMContextCreator,
    ) as jest.Mocked<LLMContextCreator>;
    actionsParser = new ActionsParser(mockDebugLogger, mockContextCreator);
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
    });

    it("should allow reprocessing of previously processed tags after reset", () => {
      const tag = "<read_file><path>test.txt</path></read_file>";

      // First processing
      let result = actionsParser.findCompleteTags(tag);
      expect(result.groups[0].actions).toHaveLength(1);

      // Should not find tags second time
      result = actionsParser.findCompleteTags(tag);
      expect(result.groups).toHaveLength(0);

      // After reset, should find tags again
      actionsParser.reset();
      result = actionsParser.findCompleteTags(tag);
      expect(result.groups[0].actions).toHaveLength(1);
    });
  });

  describe("isCompleteMessage", () => {
    it("should always return true", () => {
      expect(actionsParser.isCompleteMessage("any text")).toBe(true);
    });
  });

  describe("extractFilePath", () => {
    it("should extract file path from valid action tags", () => {
      const tag = "<read_file><path>test/file.txt</path></read_file>";
      expect(actionsParser.extractFilePath(tag)).toBe(
        `${process.cwd()}/test/file.txt`,
      );
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
      const result = actionsParser.findCompleteTags(text);
      const allActions = result.groups.flatMap((group) => group.actions);
      expect(allActions).toHaveLength(2);
      expect(allActions[0].content).toContain("read_file");
      expect(allActions[1].content).toContain("write_file");
    });

    it("should not find incomplete tags", () => {
      const text = "<read_file><path>test.txt</path>";
      const result = actionsParser.findCompleteTags(text);
      expect(result.groups).toHaveLength(0);
    });

    it("should not return previously processed tags until buffer is cleared", () => {
      const text = "<read_file><path>test.txt</path></read_file>";

      // First run should find the tag
      const firstRun = actionsParser.findCompleteTags(text);
      expect(firstRun.groups[0].actions).toHaveLength(1);

      // Second run should not find the tag
      const secondRun = actionsParser.findCompleteTags(text);
      expect(secondRun.groups).toHaveLength(0);

      // After clearing buffer, should find the tag again
      actionsParser.clearBuffer();
      const thirdRun = actionsParser.findCompleteTags(text);
      expect(thirdRun.groups[0].actions).toHaveLength(1);
    });

    it("should handle nested tags properly", () => {
      const text = `
        <write_file>
          <path>test.txt</path>
          <content>
            <some_nested_tag>content</some_nested_tag>
          </content>
        </write_file>
      `;
      const result = actionsParser.findCompleteTags(text);
      expect(result.groups[0].actions).toHaveLength(1);
      expect(result.groups[0].actions[0].content).toContain("write_file");
    });
  });

  describe("buffer management", () => {
    it("should append to buffer", () => {
      actionsParser.appendToBuffer("test1");
      actionsParser.appendToBuffer("test2");
      expect(actionsParser.buffer).toBe("test1test2");
    });

    it("should clear buffer and processed tags", () => {
      const tag = "<read_file><path>test.txt</path></read_file>";
      actionsParser.appendToBuffer(tag);

      // First find should work
      let result = actionsParser.findCompleteTags(tag);
      expect(result.groups[0].actions).toHaveLength(1);

      // Clear and should find again
      actionsParser.clearBuffer();
      expect(actionsParser.buffer).toBe("");
      result = actionsParser.findCompleteTags(tag);
      expect(result.groups[0].actions).toHaveLength(1);
    });
  });

  describe("parseAndExecuteActions", () => {
    it("should return empty actions when no complete tags found", async () => {
      const text = "no tags here";
      const result = await actionsParser.parseAndExecuteActions(
        text,
        "test-model",
        async (msg) => "response",
      );
      expect(result.actions).toEqual([]);
    });

    it("should execute actions and return results", async () => {
      const text = "<read_file><path>test.txt</path></read_file>";
      const mockResult = { success: true, data: "content" };
      mockContextCreator.executeAction.mockResolvedValue(mockResult);

      const result = await actionsParser.parseAndExecuteActions(
        text,
        "test-model",
        async (msg) => "response",
      );

      expect(result.actions).toEqual([{ action: text, result: mockResult }]);
    });

    it("should format read_file results differently", async () => {
      const text = "<read_file><path>test.txt</path></read_file>";
      const mockResult = { success: true, data: "file content" };
      mockContextCreator.executeAction.mockResolvedValue(mockResult);

      const result = await actionsParser.parseAndExecuteActions(
        text,
        "test-model",
        async (msg) => {
          expect(msg).toContain("Here's the content of the requested file");
          expect(msg).toContain("file content");
          return "response";
        },
      );

      expect(result.actions).toEqual([{ action: text, result: mockResult }]);
    });

    it("should handle errors in action execution", async () => {
      const text = "<read_file><path>test.txt</path></read_file>";
      mockContextCreator.executeAction.mockRejectedValue(
        new Error("Test error"),
      );

      const result = await actionsParser.parseAndExecuteActions(
        text,
        "test-model",
        async (msg) => "response",
      );

      expect(result.actions).toEqual([]);
      expect(mockDebugLogger.log).toHaveBeenCalledWith(
        "Error",
        "Failed to parse and execute actions",
        expect.any(Object),
      );
    });
  });
});
