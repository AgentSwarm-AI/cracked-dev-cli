import { ConversationContext } from "@services/LLM/ConversationContext";
import { IMessage } from "@services/LLM/ILLMProvider";
import { LLMProvider } from "@services/LLM/LLMProvider";

// Mock LLMProvider
jest.mock("../LLMProvider", () => ({
  LLMProvider: {
    getInstance: jest.fn(() => ({
      getModelInfo: jest.fn().mockResolvedValue({ context_length: 4000 }),
    })),
  },
  LLMProviderType: {
    OpenRouter: "open-router",
  },
}));

describe("ConversationContext", () => {
  let conversationContext: ConversationContext;

  beforeEach(() => {
    conversationContext = new ConversationContext();
    jest.clearAllMocks();
  });

  it("should add a message to the conversation history", async () => {
    await conversationContext.addMessage("user", "Hello, Assistant!");
    expect(conversationContext.getMessages()).toContainEqual({
      role: "user",
      content: "Hello, Assistant!",
    });
  });

  it("should throw an error when adding a message with an invalid role", async () => {
    await expect(
      conversationContext.addMessage(
        "invalid-role" as any,
        "Hello, Assistant!",
      ),
    ).rejects.toThrow("Invalid role: invalid-role");
  });

  it("should get all messages including system instructions", async () => {
    await conversationContext.setSystemInstructions(
      "You are a helpful assistant.",
    );
    await conversationContext.addMessage("user", "Hello, Assistant!");
    await conversationContext.addMessage(
      "assistant",
      "Hello! How can I help you today?",
    );

    const expectedMessages: IMessage[] = [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Hello, Assistant!" },
      { role: "assistant", content: "Hello! How can I help you today?" },
    ];

    expect(conversationContext.getMessages()).toEqual(expectedMessages);
  });

  it("should clear conversation history and system instructions", async () => {
    await conversationContext.setSystemInstructions(
      "You are a helpful assistant.",
    );
    await conversationContext.addMessage("user", "Hello, Assistant!");
    conversationContext.clear();

    expect(conversationContext.getMessages()).toEqual([]);
  });

  it("should set system instructions correctly", async () => {
    await conversationContext.setSystemInstructions(
      "You are a helpful assistant.",
    );
    expect(conversationContext.getSystemInstructions()).toBe(
      "You are a helpful assistant.",
    );
  });

  it("should retrieve system instructions correctly", async () => {
    await conversationContext.setSystemInstructions("Follow the rules.");
    expect(conversationContext.getSystemInstructions()).toBe(
      "Follow the rules.",
    );
  });

  it("should handle no system instructions correctly", async () => {
    await conversationContext.addMessage("user", "Hello, Assistant!");
    await conversationContext.addMessage(
      "assistant",
      "Hello! How can I help you today?",
    );

    const expectedMessages: IMessage[] = [
      { role: "user", content: "Hello, Assistant!" },
      { role: "assistant", content: "Hello! How can I help you today?" },
    ];

    expect(conversationContext.getMessages()).toEqual(expectedMessages);
  });

  it("should not add an empty message", async () => {
    await expect(conversationContext.addMessage("user", "")).rejects.toThrow(
      "Content cannot be empty",
    );
  });

  it("should handle repeated system instructions", async () => {
    await conversationContext.setSystemInstructions("Initial instructions.");
    await conversationContext.setSystemInstructions("Updated instructions.");

    expect(conversationContext.getSystemInstructions()).toBe(
      "Updated instructions.",
    );
  });

  it("should handle clearing system instructions", async () => {
    await conversationContext.setSystemInstructions(
      "You are a helpful assistant.",
    );
    conversationContext.clear();

    expect(conversationContext.getSystemInstructions()).toBe(null);
  });

  describe("Context Window Management", () => {
    beforeEach(async () => {
      await conversationContext.setCurrentModel("test-model");
    });

    it("should cleanup old messages when context window is exceeded", async () => {
      // Mock a smaller context window
      (LLMProvider.getInstance as jest.Mock).mockReturnValue({
        getModelInfo: jest.fn().mockResolvedValue({ context_length: 100 }), // Small context window
      });

      // Add enough messages to exceed context window
      const longMessage = "x".repeat(400); // Should be ~100 tokens with our 4 char/token heuristic
      await conversationContext.addMessage("user", longMessage);
      await conversationContext.addMessage("assistant", longMessage);
      await conversationContext.addMessage("user", "New message");

      // Should have removed older messages to fit within context
      const messages = conversationContext.getMessages();
      expect(messages.length).toBeLessThan(3);
      expect(messages[messages.length - 1].content).toBe("New message");
    });

    it("should handle failed model info retrieval gracefully", async () => {
      // Mock a failed model info retrieval
      (LLMProvider.getInstance as jest.Mock).mockReturnValue({
        getModelInfo: jest.fn().mockRejectedValue(new Error("API Error")),
      });

      // Should not throw when adding messages
      await expect(
        conversationContext.addMessage("user", "Hello"),
      ).resolves.not.toThrow();
    });

    it("should preserve recent messages during cleanup", async () => {
      (LLMProvider.getInstance as jest.Mock).mockReturnValue({
        getModelInfo: jest.fn().mockResolvedValue({ context_length: 100 }),
      });

      await conversationContext.addMessage("user", "First message");
      await conversationContext.addMessage("assistant", "Second message");
      const finalMessage = "Final message";
      await conversationContext.addMessage("user", finalMessage);

      const messages = conversationContext.getMessages();
      expect(messages[messages.length - 1].content).toBe(finalMessage);
    });
  });
});
