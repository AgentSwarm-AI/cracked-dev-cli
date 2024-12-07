import { ConfigService } from "@services/ConfigService";
import { ModelInfo } from "@services/LLM/ModelInfo";
import { DebugLogger } from "@services/logging/DebugLogger";
import { container } from "tsyringe";
import { MessageContextBuilder } from "../MessageContextBuilder";
import { MessageContextCleanup } from "../MessageContextCleanup";
import { MessageContextManager } from "../MessageContextManager";
import { MessageConversationLogger } from "../MessageConversationLogger";

describe("MessageContextManager", () => {
  let messageContextManager: MessageContextManager;
  let debugLogger: DebugLogger;
  let modelInfo: ModelInfo;
  let configService: ConfigService;
  let conversationLogger: MessageConversationLogger;
  let contextBuilder: MessageContextBuilder;
  let contextCleanup: MessageContextCleanup;

  beforeEach(() => {
    debugLogger = container.resolve(DebugLogger);
    modelInfo = container.resolve(ModelInfo);
    configService = container.resolve(ConfigService);
    contextBuilder = container.resolve(MessageContextBuilder);
    contextCleanup = container.resolve(MessageContextCleanup);
    conversationLogger = container.resolve(MessageConversationLogger);

    jest
      .spyOn(modelInfo, "getCurrentModelContextLength")
      .mockResolvedValue(100);
    jest.spyOn(modelInfo, "logCurrentModelUsage").mockResolvedValue();
    jest.spyOn(contextBuilder, "getConversationHistory").mockReturnValue([]);
    jest.spyOn(contextBuilder, "addMessage");
    jest.spyOn(contextBuilder, "updateOperationResult");
    jest.spyOn(contextBuilder, "clear");
    jest.spyOn(contextBuilder, "setSystemInstructions");
    jest.spyOn(contextBuilder, "getSystemInstructions").mockReturnValue(null);
    jest.spyOn(contextCleanup, "cleanupContext");

    messageContextManager = new MessageContextManager(
      debugLogger,
      modelInfo,
      configService,
      conversationLogger,
      contextBuilder,
      contextCleanup,
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
      const message = { role: "user" as const, content: "Hello" };
      jest
        .spyOn(contextBuilder, "getConversationHistory")
        .mockReturnValue([message]);

      messageContextManager.addMessage("user", "Hello");

      expect(contextBuilder.addMessage).toHaveBeenCalledWith("user", "Hello");
      expect(messageContextManager.getMessages()).toEqual([message]);
    });

    it("should add an assistant message", () => {
      const message = { role: "assistant" as const, content: "Hi there!" };
      jest
        .spyOn(contextBuilder, "getConversationHistory")
        .mockReturnValue([message]);

      messageContextManager.addMessage("assistant", "Hi there!");

      expect(contextBuilder.addMessage).toHaveBeenCalledWith(
        "assistant",
        "Hi there!",
      );
      expect(messageContextManager.getMessages()).toEqual([message]);
    });

    it("should add a system message", () => {
      const message = {
        role: "system" as const,
        content: "System instruction",
      };
      jest
        .spyOn(contextBuilder, "getConversationHistory")
        .mockReturnValue([message]);

      messageContextManager.addMessage("system", "System instruction");

      expect(contextBuilder.addMessage).toHaveBeenCalledWith(
        "system",
        "System instruction",
      );
      expect(messageContextManager.getMessages()).toEqual([message]);
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
  });

  describe("getMessages", () => {
    it("should return conversation messages from context builder", () => {
      const messages = [
        { role: "user" as const, content: "Hello" },
        { role: "assistant" as const, content: "Hi there!" },
      ];
      jest
        .spyOn(contextBuilder, "getConversationHistory")
        .mockReturnValue(messages);

      expect(messageContextManager.getMessages()).toEqual(messages);
    });
  });

  describe("clear", () => {
    it("should clear the conversation context", () => {
      messageContextManager.clear();
      expect(contextBuilder.clear).toHaveBeenCalled();
    });

    it("should log that context was cleared", () => {
      jest.spyOn(debugLogger, "log");
      jest
        .spyOn(contextBuilder, "getConversationHistory")
        .mockReturnValue([{ role: "user", content: "Hello" }]);
      jest
        .spyOn(contextBuilder, "getSystemInstructions")
        .mockReturnValue("Be helpful");

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
      expect(contextBuilder.setSystemInstructions).toHaveBeenCalledWith(
        "Be helpful",
      );
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
    it("should return system instructions from context builder", () => {
      jest
        .spyOn(contextBuilder, "getSystemInstructions")
        .mockReturnValue("Be helpful");
      expect(messageContextManager.getSystemInstructions()).toBe("Be helpful");
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
    it("should calculate total token count from conversation history", () => {
      const messages = [
        { role: "system" as const, content: "Be helpful" },
        { role: "user" as const, content: "Hello" },
        { role: "assistant" as const, content: "Hi there!" },
      ];
      jest
        .spyOn(contextBuilder, "getConversationHistory")
        .mockReturnValue(messages);

      expect(messageContextManager.getTotalTokenCount()).toBe(8);
    });
  });

  describe("cleanupContext", () => {
    it("should delegate cleanup to MessageContextCleanup", async () => {
      jest.spyOn(contextCleanup, "cleanupContext").mockResolvedValue(true);
      jest
        .spyOn(modelInfo, "getCurrentModelContextLength")
        .mockResolvedValue(100);

      expect(await messageContextManager.cleanupContext()).toBe(true);
      expect(contextCleanup.cleanupContext).toHaveBeenCalledWith(
        100,
        expect.any(Function),
      );
    });

    it("should log cleanup results when cleanup occurs", async () => {
      jest.spyOn(contextCleanup, "cleanupContext").mockResolvedValue(true);
      jest.spyOn(debugLogger, "log");
      jest
        .spyOn(modelInfo, "getCurrentModelContextLength")
        .mockResolvedValue(100);

      await messageContextManager.cleanupContext();

      expect(debugLogger.log).toHaveBeenCalledWith(
        "Context",
        "Context cleanup performed",
        expect.any(Object),
      );
    });

    it("should not log cleanup results when no cleanup occurs", async () => {
      jest.spyOn(contextCleanup, "cleanupContext").mockResolvedValue(false);
      jest.spyOn(debugLogger, "log");

      await messageContextManager.cleanupContext();

      expect(debugLogger.log).not.toHaveBeenCalled();
    });
  });

  describe("logAction", () => {
    it("should update read_file operation result", () => {
      messageContextManager.logAction("read_file:/path/to/file", {
        success: true,
        result: "file content",
      });
      expect(contextBuilder.updateOperationResult).toHaveBeenCalledWith(
        "read_file",
        "/path/to/file",
        "file content",
      );
    });

    it("should update write_file operation result", () => {
      messageContextManager.logAction("write_file:/path/to/file", {
        success: true,
        result: "write successful",
      });
      expect(contextBuilder.updateOperationResult).toHaveBeenCalledWith(
        "write_file",
        "/path/to/file",
        "write successful",
      );
    });

    it("should update execute_command operation result", () => {
      messageContextManager.logAction("execute_command:npm install", {
        success: true,
        result: "packages installed",
      });
      expect(contextBuilder.updateOperationResult).toHaveBeenCalledWith(
        "execute_command",
        "npm install",
        "packages installed",
      );
    });
  });
});
