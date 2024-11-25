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
    mocker.spyOnPrototypeAndReturn(DebugLogger, "log", jest.fn());
    mocker.spyOnPrototypeAndReturn(
      LLMContextCreator,
      "executeAction",
      jest.fn(),
    );
    mocker.spyOnPrototypeAndReturn(HtmlEntityDecoder, "decode", jest.fn());
    mocker.spyOnPrototypeAndReturn(
      ActionTagsExtractor,
      "validateStructure",
      jest.fn(),
    );
    mocker.spyOnPrototypeAndReturn(
      ActionTagsExtractor,
      "extractTag",
      jest.fn(),
    );
    mocker.spyOnPrototypeAndReturn(
      ActionTagsExtractor,
      "extractTags",
      jest.fn(),
    );
    mocker.spyOnPrototypeAndReturn(
      ActionTagsExtractor,
      "extractTagLines",
      jest.fn(),
    );
    mocker.spyOnPrototypeAndReturn(
      ActionTagsExtractor,
      "extractNestedTags",
      jest.fn(),
    );
    mocker.spyOnPrototypeAndReturn(
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
      (
        actionsParser as any
      ).actionTagsExtractor.validateStructure.mockReturnValue("");

      let result = actionsParser.findCompleteTags(tag);
      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].actions).toHaveLength(1);

      result = actionsParser.findCompleteTags(tag);
      expect(result.groups).toHaveLength(0);

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

  describe("extractUrl", () => {
    it("should extract URL from valid fetch_url tag", () => {
      const tag = "<fetch_url><url>https://example.com</url></fetch_url>";
      expect(actionsParser.extractUrl(tag)).toBe("https://example.com");
    });

    it("should return null for invalid tags", () => {
      const tag = "<invalid_tag><url>https://example.com</url></invalid_tag>";
      expect(actionsParser.extractUrl(tag)).toBeNull();
    });

    it("should return null when url is missing", () => {
      const tag = "<fetch_url></fetch_url>";
      expect(actionsParser.extractUrl(tag)).toBeNull();
    });
  });

  describe("findCompleteTags", () => {
    beforeEach(() => {
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

    it("should create execution groups with correct parallel flag", () => {
      const text = `
        <read_file><path>test1.txt</path></read_file>
        <read_file><path>test2.txt</path></read_file>
        <write_file><path>test3.txt</path></write_file>
      `;
      const result = actionsParser.findCompleteTags(text);
      expect(result.groups).toHaveLength(2);
      expect(result.groups[0].parallel).toBe(true);
      expect(result.groups[0].actions).toHaveLength(2);
      expect(result.groups[1].parallel).toBe(true);
      expect(result.groups[1].actions).toHaveLength(1);
    });
  });

  describe("parseAndExecuteActions", () => {
    beforeEach(() => {
      (
        actionsParser as any
      ).actionTagsExtractor.validateStructure.mockReturnValue("");
    });

    it("should execute actions in parallel when possible", async () => {
      const text = `
        <read_file><path>test1.txt</path></read_file>
        <read_file><path>test2.txt</path></read_file>
      `;
      const mockResult = { success: true, data: "content" };
      (actionsParser as any).contextCreator.executeAction.mockResolvedValue(
        mockResult,
      );

      const result = await actionsParser.parseAndExecuteActions(
        text,
        "test-model",
        async (msg: string) => "response",
      );

      expect(result.actions).toHaveLength(2);
      expect(result.actions.every((a) => a.result === mockResult)).toBe(true);
    });

    it("should update model when write action returns a new model", async () => {
      const text = "<write_file><path>test.txt</path></write_file>";
      const mockResult = {
        success: true,
        data: { selectedModel: "new-model" },
      };
      (actionsParser as any).contextCreator.executeAction.mockResolvedValue(
        mockResult,
      );

      const result = await actionsParser.parseAndExecuteActions(
        text,
        "test-model",
        async (msg: string) => "response",
      );

      expect(result.selectedModel).toBe("new-model");
      expect((actionsParser as any).debugLogger.log).toHaveBeenCalledWith(
        "Model",
        "Updated model from write action",
        { model: "new-model" },
      );
    });

    it("should handle end task action correctly", async () => {
      const text = "<end_task><result>Task done</result></end_task>";
      const mockResult = { success: true, data: "Task done" };
      (actionsParser as any).contextCreator.executeAction.mockResolvedValue(
        mockResult,
      );

      const result = await actionsParser.parseAndExecuteActions(
        text,
        "test-model",
        async (msg: string) => "response",
      );

      expect(result.actions).toHaveLength(1);
      expect(result.followupResponse).toBeUndefined();
      expect((actionsParser as any).debugLogger.log).toHaveBeenCalledWith(
        "EndTask",
        "Task completed",
        { message: "Task done" },
      );
    });

    it("should log action failure in sequential execution", async () => {
      const text = `
        <write_file><path>test1.txt</path></write_file>
        <write_file><path>test2.txt</path></write_file>
      `;
      const successResult = { success: true, data: "content" };
      const failureResult = { success: false, error: "Failed" };

      (actionsParser as any).contextCreator.executeAction
        .mockResolvedValueOnce(successResult)
        .mockResolvedValueOnce(failureResult);

      const result = await actionsParser.parseAndExecuteActions(
        text,
        "test-model",
        async (msg: string) => "response",
      );

      expect(result.actions).toHaveLength(2);
      expect((actionsParser as any).debugLogger.log).toHaveBeenCalledWith(
        "Action",
        "Action failed",
        {
          action: expect.stringContaining("write_file"),
          result: failureResult,
        },
      );
    });

    it("should format different action results correctly", async () => {
      const readFileTag = "<read_file><path>test.txt</path></read_file>";
      const fetchUrlTag =
        "<fetch_url><url>https://example.com</url></fetch_url>";
      const endTaskTag = "<end_task><result>Done</result></end_task>";
      const lookupTag =
        "<relative_path_lookup><path>test</path></relative_path_lookup>";

      (actionsParser as any).contextCreator.executeAction.mockImplementation(
        (action: string) => {
          if (action.includes("read_file")) {
            return Promise.resolve({ success: true, data: "file content" });
          }
          if (action.includes("fetch_url")) {
            return Promise.resolve({ success: true, data: "url content" });
          }
          if (action.includes("end_task")) {
            return Promise.resolve({ success: true, data: "Done" });
          }
          if (action.includes("relative_path_lookup")) {
            return Promise.resolve({ success: true, data: "/path/found" });
          }
          return Promise.resolve({ success: true, data: "default" });
        },
      );

      (actionsParser as any).htmlEntityDecoder.decode.mockReturnValue(
        "decoded content",
      );

      let result = await actionsParser.parseAndExecuteActions(
        readFileTag,
        "test-model",
        async (msg: string) => {
          expect(msg).toContain("Here's the content of the requested file");
          expect(msg).toContain("decoded content");
          return "response";
        },
      );

      result = await actionsParser.parseAndExecuteActions(
        fetchUrlTag,
        "test-model",
        async (msg: string) => {
          expect(msg).toContain("Here's the content fetched from the URL");
          expect(msg).toContain("url content");
          return "response";
        },
      );

      result = await actionsParser.parseAndExecuteActions(
        lookupTag,
        "test-model",
        async (msg: string) => {
          expect(msg).toContain("Found matching path");
          expect(msg).toContain("/path/found");
          return "response";
        },
      );
    });
  });
});
