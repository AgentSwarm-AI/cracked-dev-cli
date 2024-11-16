import { container } from "tsyringe";
import { DebugLogger } from "../../DebugLogger";
import { LLMContextCreator } from "../LLMContextCreator";
import { ActionsParser } from "./ActionsParser";

jest.mock("../../DebugLogger");
jest.mock("../LLMContextCreator");

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
      let tags = actionsParser.findCompleteTags(tag);
      expect(tags).toHaveLength(1);

      // Should not find tags second time
      tags = actionsParser.findCompleteTags(tag);
      expect(tags).toHaveLength(0);

      // After reset, should find tags again
      actionsParser.reset();
      tags = actionsParser.findCompleteTags(tag);
      expect(tags).toHaveLength(1);
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

    it("should not return previously processed tags until buffer is cleared", () => {
      const text = "<read_file><path>test.txt</path></read_file>";

      // First run should find the tag
      const firstRun = actionsParser.findCompleteTags(text);
      expect(firstRun).toHaveLength(1);

      // Second run should not find the tag
      const secondRun = actionsParser.findCompleteTags(text);
      expect(secondRun).toHaveLength(0);

      // After clearing buffer, should find the tag again
      actionsParser.clearBuffer();
      const thirdRun = actionsParser.findCompleteTags(text);
      expect(thirdRun).toHaveLength(1);
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
      const tags = actionsParser.findCompleteTags(text);
      expect(tags).toHaveLength(1);
      expect(tags[0]).toContain("write_file");
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
      let tags = actionsParser.findCompleteTags(tag);
      expect(tags).toHaveLength(1);

      // Clear and should find again
      actionsParser.clearBuffer();
      expect(actionsParser.buffer).toBe("");
      tags = actionsParser.findCompleteTags(tag);
      expect(tags).toHaveLength(1);
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
      const mockActions = [
        { action: text, result: { success: true, data: "content" } },
      ];
      mockContextCreator.parseAndExecuteActions.mockResolvedValue(mockActions);

      const result = await actionsParser.parseAndExecuteActions(
        text,
        "test-model",
        async (msg) => "response",
      );

      expect(result.actions).toEqual(mockActions);
    });

    it("should format read_file results differently", async () => {
      const text = "<read_file><path>test.txt</path></read_file>";
      const mockActions = [
        {
          action: text,
          result: { success: true, data: "file content" },
        },
      ];
      mockContextCreator.parseAndExecuteActions.mockResolvedValue(mockActions);

      const result = await actionsParser.parseAndExecuteActions(
        text,
        "test-model",
        async (msg) => {
          expect(msg).toContain("Here's the content of the requested file");
          expect(msg).toContain("file content");
          return "response";
        },
      );

      expect(result.actions).toEqual(mockActions);
    });

    it("should handle errors in action execution", async () => {
      const text = "<read_file><path>test.txt</path></read_file>";
      mockContextCreator.parseAndExecuteActions.mockRejectedValue(
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
