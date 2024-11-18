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
    expect(conversationContext["systemInstructions"]).toBe(
      "You are a helpful assistant.",
    );
  });
});
