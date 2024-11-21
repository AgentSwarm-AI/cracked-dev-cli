import { MessageContextManager } from "@services/LLM/MessageContextManager";
import { container } from "tsyringe";

describe("MessageContextManager", () => {
  let messageContextManager: MessageContextManager;

  beforeEach(() => {
    messageContextManager = container.resolve(MessageContextManager);
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
    it("should add a message to conversation history", () => {
      messageContextManager.addMessage("user", "Hello");
      expect(messageContextManager.getMessages()).toEqual([
        { role: "user", content: "Hello" },
      ]);
    });

    it("should throw error for invalid role", () => {
      expect(() =>
        messageContextManager.addMessage("invalid" as any, "Hello"),
      ).toThrow("Invalid role: invalid");
    });

    it("should throw error for empty content", () => {
      expect(() => messageContextManager.addMessage("user", "  ")).toThrow(
        "Content cannot be empty",
      );
    });
  });

  describe("getMessages", () => {
    it("should return messages with system instructions first when present", () => {
      messageContextManager.setSystemInstructions("Be helpful");
      messageContextManager.addMessage("user", "Hello");

      expect(messageContextManager.getMessages()).toEqual([
        { role: "system", content: "Be helpful" },
        { role: "user", content: "Hello" },
      ]);
    });

    it("should return only conversation history when no system instructions", () => {
      messageContextManager.addMessage("user", "Hello");
      messageContextManager.addMessage("assistant", "Hi there!");

      expect(messageContextManager.getMessages()).toEqual([
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there!" },
      ]);
    });
  });

  describe("clear", () => {
    it("should clear conversation history and system instructions", () => {
      messageContextManager.setSystemInstructions("Be helpful");
      messageContextManager.addMessage("user", "Hello");
      messageContextManager.clear();

      expect(messageContextManager.getMessages()).toEqual([]);
      expect(messageContextManager.getSystemInstructions()).toBeNull();
    });
  });

  describe("setSystemInstructions", () => {
    it("should set system instructions", () => {
      messageContextManager.setSystemInstructions("Be helpful");
      expect(messageContextManager.getSystemInstructions()).toBe("Be helpful");
    });
  });

  describe("estimateTokenCount", () => {
    it("should estimate tokens based on character count", () => {
      const text = "Hello, world!"; // 13 characters
      expect(messageContextManager.estimateTokenCount(text)).toBe(4); // ceil(13/4)
    });

    it("should handle empty string", () => {
      expect(messageContextManager.estimateTokenCount("")).toBe(0);
    });
  });

  describe("getTotalTokenCount", () => {
    it("should count tokens for all messages and system instructions", () => {
      messageContextManager.setSystemInstructions("Be helpful"); // 10 chars = 3 tokens
      messageContextManager.addMessage("user", "Hello"); // 5 chars = 2 tokens
      messageContextManager.addMessage("assistant", "Hi!"); // 3 chars = 1 token

      // Total should be 6 tokens
      expect(messageContextManager.getTotalTokenCount()).toBe(6);
    });

    it("should handle empty conversation", () => {
      expect(messageContextManager.getTotalTokenCount()).toBe(0);
    });
  });

  describe("cleanupContext", () => {
    it("should remove oldest messages until under token limit", () => {
      messageContextManager.addMessage("user", "First message"); // 12 chars = 3 tokens
      messageContextManager.addMessage("assistant", "Second message"); // 13 chars = 4 tokens
      messageContextManager.addMessage("user", "Third message"); // 12 chars = 3 tokens

      // Set max tokens to 7, should remove first message
      messageContextManager.cleanupContext(7);

      const messages = messageContextManager.getMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe("Second message");
      expect(messages[1].content).toBe("Third message");
    });

    it("should handle empty conversation", () => {
      messageContextManager.cleanupContext(10);
      expect(messageContextManager.getMessages()).toEqual([]);
    });

    it("should preserve system instructions during cleanup", () => {
      messageContextManager.setSystemInstructions("Be helpful"); // 10 chars = 3 tokens
      messageContextManager.addMessage("user", "First message"); // 12 chars = 3 tokens
      messageContextManager.addMessage("assistant", "Second message"); // 13 chars = 4 tokens

      // Set max tokens to 7, should keep system instructions and remove first message
      messageContextManager.cleanupContext(7);

      const messages = messageContextManager.getMessages();
      expect(messages[0]).toEqual({ role: "system", content: "Be helpful" });
      expect(messages[1].content).toBe("Second message");
    });
  });
});
