import { MessageContextManager } from "@services/LLM/MessageContextManager";
import { DebugLogger } from "@services/logging/DebugLogger";
import { container } from "tsyringe";

describe("MessageContextManager", () => {
  let messageContextManager: MessageContextManager;
  let debugLogger: DebugLogger;

  beforeEach(() => {
    debugLogger = container.resolve(DebugLogger);
    messageContextManager = new MessageContextManager(debugLogger);
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
      expect(() => messageContextManager.addMessage("invalid" as any, "Hello")).toThrow("Invalid role: invalid");
    });

    it("should throw an error for empty content", () => {
      expect(() => messageContextManager.addMessage("user", "")).toThrow("Content cannot be empty");
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
      expect(debugLogger.log).toHaveBeenCalledWith("Context", "Context cleared", {
        clearedMessages: true,
        clearedInstructions: true,
      });
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
      expect(debugLogger.log).toHaveBeenCalledWith("Context", "System instructions updated", {
        hadPreviousInstructions: false,
        instructionsLength: 10,
      });
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
      expect(messageContextManager.estimateTokenCount("This is a test message.")).toBe(6);
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
    it("should not cleanup if conversation history is empty", () => {
      expect(messageContextManager.cleanupContext(100)).toBe(false);
    });

    it("should not cleanup if total token count is within max tokens", () => {
      messageContextManager.addMessage("user", "Hello");
      expect(messageContextManager.cleanupContext(100)).toBe(false);
    });

    it("should cleanup if total token count exceeds max tokens", () => {
      messageContextManager.setSystemInstructions("Be helpful");
      messageContextManager.addMessage("user", "Hello");
      messageContextManager.addMessage("assistant", "Hi there!");
      messageContextManager.addMessage("user", "This is a longer message that should trigger cleanup.");
      expect(messageContextManager.cleanupContext(10)).toBe(true);
      expect(messageContextManager.getMessages()).toEqual([
        { role: "system", content: "Be helpful" },
      ]);
    });

    it("should log that context cleanup was performed", () => {
      jest.spyOn(debugLogger, "log");
      messageContextManager.setSystemInstructions("Be helpful");
      messageContextManager.addMessage("user", "Hello");
      messageContextManager.addMessage("assistant", "Hi there!");
      messageContextManager.addMessage("user", "This is a longer message that should trigger cleanup.");
      messageContextManager.cleanupContext(10);
      expect(debugLogger.log).toHaveBeenCalledWith("Context", "Context cleanup performed", expect.any(Object));
    });
  });
});