/* eslint-disable @typescript-eslint/ban-ts-comment */
import { ConfigService } from "@services/ConfigService";
import { ModelInfo } from "@services/LLM/ModelInfo";
import { DebugLogger } from "@services/logging/DebugLogger";
import { container } from "tsyringe";
import { MessageContextManager } from "../MessageContextManager";
import { MessageConversationLogger } from "../MessageConversationLogger";

describe("MessageContextManager", () => {
  let messageContextManager: MessageContextManager;
  let debugLogger: DebugLogger;
  let modelInfo: ModelInfo;
  let configService: ConfigService;
  let conversationLogger: MessageConversationLogger;

  beforeEach(() => {
    debugLogger = container.resolve(DebugLogger);
    modelInfo = container.resolve(ModelInfo);
    configService = container.resolve(ConfigService);

    jest
      .spyOn(modelInfo, "getCurrentModelContextLength")
      .mockResolvedValue(100);
    jest.spyOn(modelInfo, "logCurrentModelUsage").mockResolvedValue();
    messageContextManager = new MessageContextManager(
      debugLogger,
      modelInfo,
      configService,
      conversationLogger,
    );
  });

  afterEach(() => {
    container.clearInstances();
    jest.clearAllMocks();
  });

  describe("setCurrentModel", () => {
    it("should set the current model", () => {
      messageContextManager.setCurrentModel("gpt-4");
      expect(messageContextManager.getCurrentModel()).toBe("gpt-4");
    });
  });

  describe("addMessage", () => {
    it("should add a user message", () => {
      messageContextManager.addMessage("user", "Hello");
      expect(messageContextManager.getMessages()).toEqual([
        { role: "user", content: "Hello" },
      ]);
    });

    it("should add an assistant message", () => {
      messageContextManager.addMessage("assistant", "Hi there!");
      expect(messageContextManager.getMessages()).toEqual([
        { role: "assistant", content: "Hi there!" },
      ]);
    });

    it("should add a system message", () => {
      messageContextManager.addMessage("system", "System instruction");
      expect(messageContextManager.getMessages()).toEqual([
        { role: "system", content: "System instruction" },
      ]);
    });

    it("should throw an error for invalid role", () => {
      expect(() =>
        messageContextManager.addMessage("invalid" as any, "Hello"),
      ).toThrow("Invalid role: invalid");
    });

    it("should throw an error for empty content", () => {
      expect(() => messageContextManager.addMessage("user", "")).toThrow(
        "Content cannot be empty",
      );
    });

    it("should remove old phase prompts when new phase prompt is added", () => {
      messageContextManager.addMessage(
        "assistant",
        `<phase_prompt>
          Discovery Phase
        </phase_prompt>
        Some discovery content`,
      );

      messageContextManager.addMessage(
        "assistant",
        `<phase_prompt>
          Strategy Phase
        </phase_prompt>
        Some strategy content`,
      );

      expect(messageContextManager.getMessages()).toEqual([
        {
          role: "assistant",
          content: `<phase_prompt>
          Strategy Phase
        </phase_prompt>
        Some strategy content`,
        },
      ]);
    });

    it("should not remove non-phase messages when new phase prompt is added", () => {
      messageContextManager.addMessage("user", "Initial request");
      messageContextManager.addMessage(
        "assistant",
        `<phase_prompt>
          Discovery Phase
        </phase_prompt>
        Some discovery content`,
      );
      messageContextManager.addMessage("user", "Additional info");
      messageContextManager.addMessage(
        "assistant",
        `<phase_prompt>
          Strategy Phase
        </phase_prompt>
        Some strategy content`,
      );

      expect(messageContextManager.getMessages()).toEqual([
        { role: "user", content: "Initial request" },
        { role: "user", content: "Additional info" },
        {
          role: "assistant",
          content: `<phase_prompt>
          Strategy Phase
        </phase_prompt>
        Some strategy content`,
        },
      ]);
    });

    it("should handle phase prompts and file operations cleanup together", () => {
      messageContextManager.addMessage(
        "assistant",
        `<phase_prompt>
          Discovery Phase
        </phase_prompt>
        <read_file>
          <path>/path/to/file1</path>
        </read_file>`,
      );

      messageContextManager.addMessage(
        "assistant",
        `<phase_prompt>
          Strategy Phase
        </phase_prompt>
        <read_file>
          <path>/path/to/file1</path>
        </read_file>`,
      );

      expect(messageContextManager.getMessages()).toEqual([
        {
          role: "assistant",
          content: `<phase_prompt>
          Strategy Phase
        </phase_prompt>
        <read_file>
          <path>/path/to/file1</path>
        </read_file>`,
        },
      ]);
    });
  });

  describe("getMessages", () => {
    it("should return conversation messages", () => {
      messageContextManager.addMessage("user", "Hello");
      messageContextManager.addMessage("assistant", "Hi there!");
      expect(messageContextManager.getMessages()).toEqual([
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there!" },
      ]);
    });

    it("should include system instructions if set", () => {
      messageContextManager.setSystemInstructions("Be helpful");
      messageContextManager.addMessage("user", "Hello");
      expect(messageContextManager.getMessages()).toEqual([
        { role: "system", content: "Be helpful" },
        { role: "user", content: "Hello" },
      ]);
    });
  });

  describe("clear", () => {
    it("should clear the conversation context", () => {
      messageContextManager.addMessage("user", "Hello");
      messageContextManager.setSystemInstructions("Be helpful");
      messageContextManager.clear();
      expect(messageContextManager.getMessages()).toEqual([]);
      expect(messageContextManager.getSystemInstructions()).toBeNull();
    });

    it("should log that context was cleared", () => {
      jest.spyOn(debugLogger, "log");
      messageContextManager.addMessage("user", "Hello");
      messageContextManager.setSystemInstructions("Be helpful");
      messageContextManager.clear();
      expect(debugLogger.log).toHaveBeenCalledWith(
        "Context",
        "Context cleared",
        {
          clearedMessages: true,
          clearedInstructions: true,
        },
      );
    });
  });

  describe("setSystemInstructions", () => {
    it("should set system instructions", () => {
      messageContextManager.setSystemInstructions("Be helpful");
      expect(messageContextManager.getSystemInstructions()).toBe("Be helpful");
    });

    it("should log that system instructions were updated", () => {
      jest.spyOn(debugLogger, "log");
      messageContextManager.setSystemInstructions("Be helpful");
      expect(debugLogger.log).toHaveBeenCalledWith(
        "Context",
        "System instructions updated",
        {
          hadPreviousInstructions: false,
          instructionsLength: 10,
        },
      );
    });
  });

  describe("getSystemInstructions", () => {
    it("should return system instructions when set", () => {
      messageContextManager.setSystemInstructions("Be helpful");
      expect(messageContextManager.getSystemInstructions()).toBe("Be helpful");
    });

    it("should return null when no system instructions are set", () => {
      expect(messageContextManager.getSystemInstructions()).toBeNull();
    });
  });

  describe("estimateTokenCount", () => {
    it("should estimate token count correctly", () => {
      expect(messageContextManager.estimateTokenCount("Hello world")).toBe(3);
      expect(
        messageContextManager.estimateTokenCount("This is a test message."),
      ).toBe(6);
    });
  });

  describe("getTotalTokenCount", () => {
    it("should calculate total token count with system instructions", () => {
      messageContextManager.setSystemInstructions("Be helpful");
      messageContextManager.addMessage("user", "Hello");
      messageContextManager.addMessage("assistant", "Hi there!");
      expect(messageContextManager.getTotalTokenCount()).toBe(8);
    });

    it("should calculate total token count without system instructions", () => {
      messageContextManager.addMessage("user", "Hello");
      messageContextManager.addMessage("assistant", "Hi there!");
      expect(messageContextManager.getTotalTokenCount()).toBe(5);
    });
  });

  describe("cleanupContext", () => {
    it("should not cleanup if conversation history is empty", async () => {
      expect(await messageContextManager.cleanupContext()).toBe(false);
    });

    it("should not cleanup if total token count is within max tokens", async () => {
      messageContextManager.addMessage("user", "Hello");
      expect(await messageContextManager.cleanupContext()).toBe(false);
    });

    it("should cleanup if total token count exceeds max tokens", async () => {
      jest
        .spyOn(modelInfo, "getCurrentModelContextLength")
        .mockResolvedValue(10);
      messageContextManager.setSystemInstructions("Be helpful");
      messageContextManager.addMessage("user", "Hello");
      messageContextManager.addMessage("assistant", "Hi there!");
      messageContextManager.addMessage(
        "user",
        "This is a longer message that should trigger cleanup.",
      );
      expect(await messageContextManager.cleanupContext()).toBe(true);
      expect(messageContextManager.getMessages()).toEqual([
        { role: "system", content: "Be helpful" },
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there!" },
      ]);
    });

    it("should log that context cleanup was performed", async () => {
      jest
        .spyOn(modelInfo, "getCurrentModelContextLength")
        .mockResolvedValue(10);
      jest.spyOn(debugLogger, "log");
      messageContextManager.setSystemInstructions("Be helpful");
      messageContextManager.addMessage("user", "Hello");
      messageContextManager.addMessage("assistant", "Hi there!");
      messageContextManager.addMessage(
        "user",
        "This is a longer message that should trigger cleanup.",
      );
      await messageContextManager.cleanupContext();
      expect(debugLogger.log).toHaveBeenCalledWith(
        "Context",
        "Context cleanup performed",
        expect.any(Object),
      );
    });
  });

  describe("extractOperations", () => {
    it("should extract write_file operations", () => {
      const content = `
        <write_file>
          <path>/path/to/file1</path>
        </write_file>
        <write_file>
          <path>/path/to/file2</path>
        </write_file>
      `;
      // @ts-ignore: Testing private method
      const operations = messageContextManager.extractOperations(content);
      expect(operations).toEqual([
        { type: "write_file", path: "/path/to/file1" },
        { type: "write_file", path: "/path/to/file2" },
      ]);
    });

    it("should extract read_file operations", () => {
      const content = `
        <read_file>
          <path>/path/to/file1</path>
        </read_file>
        <read_file>
          <path>/path/to/file2</path>
        </read_file>
      `;
      // @ts-ignore: Testing private method
      const operations = messageContextManager.extractOperations(content);
      expect(operations).toEqual([
        { type: "read_file", path: "/path/to/file1" },
        { type: "read_file", path: "/path/to/file2" },
      ]);
    });

    it("should extract both write_file and read_file operations", () => {
      const content = `
        <write_file>
          <path>/path/to/file1</path>
        </write_file>
        <read_file>
          <path>/path/to/file2</path>
        </read_file>
      `;
      // @ts-ignore: Testing private method
      const operations = messageContextManager.extractOperations(content);
      expect(operations).toEqual([
        { type: "write_file", path: "/path/to/file1" },
        { type: "read_file", path: "/path/to/file2" },
      ]);
    });

    it("should return an empty array if no file operations are present", () => {
      const content = "No file operations here";
      // @ts-ignore: Testing private method
      const operations = messageContextManager.extractOperations(content);
      expect(operations).toEqual([]);
    });
  });

  describe("removeOldOperations", () => {
    it("should keep only the most recent message with read_file operations", () => {
      messageContextManager.addMessage(
        "user",
        `
        <write_file>
          <path>/path/to/file1</path>
        </write_file>
        <read_file>
          <path>/path/to/file2</path>
        </read_file>
        `,
      );

      messageContextManager.addMessage(
        "assistant",
        `
        <write_file>
          <path>/path/to/file1</path>
        </write_file>
        <read_file>
          <path>/path/to/file2</path>
        </read_file>
        `,
      );

      expect(messageContextManager.getMessages()).toEqual([
        {
          role: "assistant",
          content: `
        <write_file>
          <path>/path/to/file1</path>
        </write_file>
        <read_file>
          <path>/path/to/file2</path>
        </read_file>
        `,
        },
      ]);
    });

    it("should not remove old file operations if new message has different operations", () => {
      messageContextManager.addMessage(
        "user",
        `
        <write_file>
          <path>/path/to/file1</path>
        </write_file>
        <read_file>
          <path>/path/to/file2</path>
        </read_file>
        `,
      );

      messageContextManager.addMessage(
        "assistant",
        `
        <write_file>
          <path>/path/to/file3</path>
        </write_file>
        <read_file>
          <path>/path/to/file4</path>
        </read_file>
        `,
      );

      expect(messageContextManager.getMessages()).toEqual([
        {
          role: "assistant",
          content: `
        <write_file>
          <path>/path/to/file3</path>
        </write_file>
        <read_file>
          <path>/path/to/file4</path>
        </read_file>
        `,
        },
      ]);
    });

    it("should not remove old file operations if new message has no file operations", () => {
      messageContextManager.addMessage(
        "user",
        `
        <write_file>
          <path>/path/to/file1</path>
        </write_file>
        <read_file>
          <path>/path/to/file2</path>
        </read_file>
        `,
      );

      messageContextManager.addMessage("assistant", "No file operations here.");

      expect(messageContextManager.getMessages()).toEqual([
        {
          role: "user",
          content: `
        <write_file>
          <path>/path/to/file1</path>
        </write_file>
        <read_file>
          <path>/path/to/file2</path>
        </read_file>
        `,
        },
        {
          role: "assistant",
          content: "No file operations here.",
        },
      ]);
    });
  });
});
