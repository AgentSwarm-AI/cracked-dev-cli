import { ConversationContext } from "../ConversationContext";
import { IMessage } from "../ILLMProvider";

describe("ConversationContext", () => {
  let conversationContext: ConversationContext;

  beforeEach(() => {
    conversationContext = new ConversationContext();
  });

  it("should add a message to the conversation history", () => {
    conversationContext.addMessage("user", "Hello, Assistant!");
    expect(conversationContext.getMessages()).toContainEqual({
      role: "user",
      content: "Hello, Assistant!",
    });
  });

  it("should throw an error when adding a message with an invalid role", () => {
    expect(() => {
      conversationContext.addMessage("invalid-role" as any, "Hello, Assistant!");
    }).toThrow("Invalid role: invalid-role");
  });

  it("should get all messages including system instructions", () => {
    conversationContext.setSystemInstructions("You are a helpful assistant.");
    conversationContext.addMessage("user", "Hello, Assistant!");
    conversationContext.addMessage(
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

  it("should clear conversation history and system instructions", () => {
    conversationContext.setSystemInstructions("You are a helpful assistant.");
    conversationContext.addMessage("user", "Hello, Assistant!");
    conversationContext.clear();

    expect(conversationContext.getMessages()).toEqual([]);
  });

  it("should set system instructions correctly", () => {
    conversationContext.setSystemInstructions("You are a helpful assistant.");
    expect(conversationContext.getSystemInstructions()).toBe(
      "You are a helpful assistant.",
    );
  });

  it("should retrieve system instructions correctly", () => {
    conversationContext.setSystemInstructions("Follow the rules.");
    expect(conversationContext.getSystemInstructions()).toBe("Follow the rules.");
  });

  it("should handle no system instructions correctly", () => {
    conversationContext.addMessage("user", "Hello, Assistant!");
    conversationContext.addMessage("assistant", "Hello! How can I help you today?");

    const expectedMessages: IMessage[] = [
      { role: "user", content: "Hello, Assistant!" },
      { role: "assistant", content: "Hello! How can I help you today?" },
    ];

    expect(conversationContext.getMessages()).toEqual(expectedMessages);
  });

  it("should not add an empty message", () => {
    expect(() => {
      conversationContext.addMessage("user", "");
    }).toThrow("Content cannot be empty");
  });

  it("should handle repeated system instructions", () => {
    conversationContext.setSystemInstructions("Initial instructions.");
    conversationContext.setSystemInstructions("Updated instructions.");

    expect(conversationContext.getSystemInstructions()).toBe("Updated instructions.");
  });

  it("should handle clearing system instructions", () => {
    conversationContext.setSystemInstructions("You are a helpful assistant.");
    conversationContext.clear();

    expect(conversationContext.getSystemInstructions()).toBe(null);
  });
});