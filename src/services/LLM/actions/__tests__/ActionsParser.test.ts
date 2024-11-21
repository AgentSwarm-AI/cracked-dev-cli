import { ActionsParser } from "@services/LLM/actions/ActionsParser";
import { ActionTagsExtractor } from "@services/LLM/actions/ActionTagsExtractor";
import { LLMContextCreator } from "@services/LLM/LLMContextCreator";
import { DebugLogger } from "@services/logging/DebugLogger";
import { HtmlEntityDecoder } from "@services/text/HTMLEntityDecoder";
import { UnitTestMocker } from "@tests/mocks/UnitTestMocker";
import { container } from "tsyringe";

describe("ActionsParser", () => {
  let actionsParser: ActionsParser;
  let mocker: UnitTestMocker;

  beforeEach(() => {
    mocker = new UnitTestMocker();

    // Setup spies on prototype methods of dependencies before instantiating ActionsParser
    mocker.spyOnPrototype(DebugLogger, "log", jest.fn());
    mocker.spyOnPrototype(LLMContextCreator, "executeAction", jest.fn());
    mocker.spyOnPrototype(HtmlEntityDecoder, "decode", jest.fn());
    mocker.spyOnPrototype(ActionTagsExtractor, "validateStructure", jest.fn());
    mocker.spyOnPrototype(ActionTagsExtractor, "extractTag", jest.fn());
    mocker.spyOnPrototype(ActionTagsExtractor, "extractTags", jest.fn());
    mocker.spyOnPrototype(ActionTagsExtractor, "extractTagLines", jest.fn());
    mocker.spyOnPrototype(ActionTagsExtractor, "extractNestedTags", jest.fn());
    mocker.spyOnPrototype(
      ActionTagsExtractor,
      "extractAllTagsWithContent",
      jest.fn(),
    );

    // Instantiate ActionsParser after setting up mocks
    actionsParser = container.resolve(ActionsParser);
  });

  afterEach(() => {
    mocker.clearAllMocks();
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
      // Ensure validateStructure returns no error
      (
        actionsParser as any
      ).actionTagsExtractor.validateStructure.mockReturnValue("");

      // First processing
      let result = actionsParser.findCompleteTags(tag);
      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].actions).toHaveLength(1);

      // Should not find tags second time
      result = actionsParser.findCompleteTags(tag);
      expect(result.groups).toHaveLength(0);

      // After reset, should find tags again
      actionsParser.reset();
      result = actionsParser.findCompleteTags(tag);
      expect(result.groups).toHaveLength(1);
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
    beforeEach(() => {
      // Ensure validateStructure returns no error by default
      (
        actionsParser as any
      ).actionTagsExtractor.validateStructure.mockReturnValue("");
    });

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

    it("should not process tags when validation fails", () => {
      const text = "<read_file><path>test.txt</path>";
      (
        actionsParser as any
      ).actionTagsExtractor.validateStructure.mockReturnValue(
        "Missing closing tag for <read_file>",
      );

      const result = actionsParser.findCompleteTags(text);
      expect(result.groups).toHaveLength(0);
      expect((actionsParser as any).debugLogger.log).toHaveBeenCalledWith(
        "Validation",
        "Tag structure validation failed",
        { error: "Missing closing tag for <read_file>" },
      );
    });

    it("should not return previously processed tags until buffer is cleared", () => {
      const text = "<read_file><path>test.txt</path></read_file>";

      // First run should find the tag
      const firstRun = actionsParser.findCompleteTags(text);
      expect(firstRun.groups).toHaveLength(1);
      expect(firstRun.groups[0].actions).toHaveLength(1);

      // Second run should not find the tag
      const secondRun = actionsParser.findCompleteTags(text);
      expect(secondRun.groups).toHaveLength(0);

      // After clearing buffer, should find the tag again
      actionsParser.clearBuffer();
      const thirdRun = actionsParser.findCompleteTags(text);
      expect(thirdRun.groups).toHaveLength(1);
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
      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].actions).toHaveLength(1);
      expect(result.groups[0].actions[0].content).toContain("write_file");
    });
  });

  describe("buffer management", () => {
    beforeEach(() => {
      (
        actionsParser as any
      ).actionTagsExtractor.validateStructure.mockReturnValue("");
    });

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
      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].actions).toHaveLength(1);

      // Clear and should find again
      actionsParser.clearBuffer();
      expect(actionsParser.buffer).toBe("");
      result = actionsParser.findCompleteTags(tag);
      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].actions).toHaveLength(1);
    });
  });

  describe("parseAndExecuteActions", () => {
    beforeEach(() => {
      (
        actionsParser as any
      ).actionTagsExtractor.validateStructure.mockReturnValue("");
    });

    it("should return empty actions when no complete tags found", async () => {
      const text = "no tags here";
      const result = await actionsParser.parseAndExecuteActions(
        text,
        "test-model",
        async (msg) => "response",
      );
      expect(result.actions).toEqual([]);
      expect(result.followupResponse).toBeUndefined();
      expect(result.selectedModel).toBeUndefined();
      expect((actionsParser as any).debugLogger.log).toHaveBeenCalledWith(
        "Actions",
        "No action tags found in text.",
      );
    });

    it("should execute actions and return results", async () => {
      const text = "<read_file><path>test.txt</path></read_file>";
      const mockResult = { success: true, data: "content" };
      (actionsParser as any).contextCreator.executeAction.mockResolvedValue(
        mockResult,
      );
      (actionsParser as any).htmlEntityDecoder.decode.mockReturnValue(
        "decoded content",
      );

      const result = await actionsParser.parseAndExecuteActions(
        text,
        "test-model",
        async (msg) => "response",
      );

      expect(result.actions).toEqual([{ action: text, result: mockResult }]);
      expect(result.followupResponse).toBe("response");
      expect(result.selectedModel).toBe("test-model");
      expect((actionsParser as any).debugLogger.log).toHaveBeenCalledWith(
        "ExecutionPlan",
        "Created action execution plan",
        {
          plan: {
            groups: [
              {
                actions: [
                  {
                    actionId: expect.any(String),
                    type: "read_file",
                    content: text,
                    dependsOn: expect.any(Array),
                  },
                ],
                parallel: true,
              },
            ],
          },
        },
      );
    });

    it("should format read_file results differently", async () => {
      const text = "<read_file><path>test.txt</path></read_file>";
      const mockResult = { success: true, data: "file content" };
      (actionsParser as any).contextCreator.executeAction.mockResolvedValue(
        mockResult,
      );
      (actionsParser as any).htmlEntityDecoder.decode.mockReturnValue(
        "decoded content",
      );

      const result = await actionsParser.parseAndExecuteActions(
        text,
        "test-model",
        async (msg) => {
          expect(msg).toContain("Here's the content of the requested file");
          expect(msg).toContain("decoded content");
          return "response";
        },
      );

      expect(result.actions).toEqual([{ action: text, result: mockResult }]);
      expect(result.followupResponse).toBe("response");
      expect(result.selectedModel).toBe("test-model");
    });

    it("should handle execution errors gracefully", async () => {
      const text = "<read_file><path>test.txt</path></read_file>";
      (actionsParser as any).contextCreator.executeAction.mockRejectedValue(
        new Error("Test error"),
      );

      const result = await actionsParser.parseAndExecuteActions(
        text,
        "test-model",
        async (msg) => "response",
      );

      expect(result.actions).toEqual([]);
      expect(result.followupResponse).toBeUndefined();
      expect(result.selectedModel).toBeUndefined();
      expect((actionsParser as any).debugLogger.log).toHaveBeenCalledWith(
        "Error",
        "Failed to parse and execute actions",
        { error: new Error("Test error") },
      );
    });

    it("should not execute actions when tag validation fails", async () => {
      const text = "<read_file><path>test.txt</path>";
      (
        actionsParser as any
      ).actionTagsExtractor.validateStructure.mockReturnValue(
        "Missing closing tag for <read_file>",
      );

      const result = await actionsParser.parseAndExecuteActions(
        text,
        "test-model",
        async (msg) => "response",
      );

      expect(result.actions).toEqual([]);
      expect(result.followupResponse).toBeUndefined();
      expect(result.selectedModel).toBeUndefined();
      expect((actionsParser as any).debugLogger.log).toHaveBeenCalledWith(
        "Validation",
        "Tag structure validation failed",
        { error: "Missing closing tag for <read_file>" },
      );
    });

    it("should not execute actions with invalid tags", async () => {
      const text = "<invalid_tag><path>test.txt</path></invalid_tag>";
      // Assuming validateStructure returns no error for unknown tags
      (
        actionsParser as any
      ).actionTagsExtractor.validateStructure.mockReturnValue("");

      const result = await actionsParser.parseAndExecuteActions(
        text,
        "test-model",
        async (msg) => "response",
      );

      expect(result.actions).toEqual([]);
      expect(result.followupResponse).toBeUndefined();
      expect(result.selectedModel).toBeUndefined();
      expect((actionsParser as any).debugLogger.log).toHaveBeenCalledWith(
        "ExecutionPlan",
        "Created action execution plan",
        { plan: { groups: [] } },
      );
      expect((actionsParser as any).debugLogger.log).toHaveBeenCalledWith(
        "Actions",
        "No action tags found in text.",
      );
    });
  });
});
