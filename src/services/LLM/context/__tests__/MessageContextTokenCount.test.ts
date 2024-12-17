import { IConversationHistoryMessage } from "@services/LLM/ILLMProvider";
import { container } from "tsyringe";
import { MessageContextTokenCount } from "../MessageContextTokenCount";

describe("MessageContextTokenCount", () => {
  let messageContextTokenCount: MessageContextTokenCount;

  beforeEach(() => {
    messageContextTokenCount = container.resolve(MessageContextTokenCount);
  });

  it("should estimate token count for a single message", () => {
    const message: IConversationHistoryMessage = {
      role: "user",
      content: "Hello world",
    };

    const tokenCount =
      messageContextTokenCount.estimateTokenCountForMessage(message);

    // "Hello world" is 2 tokens + 4 for message format
    expect(tokenCount).toBe(6);
  });

  it("should estimate token count for multiple messages", () => {
    const messages: IConversationHistoryMessage[] = [
      {
        role: "user",
        content: "Hello",
      },
      {
        role: "assistant",
        content: "Hi there",
      },
    ];

    const tokenCount = messageContextTokenCount.estimateTokenCount(messages);

    // "Hello" is 1 token + 4 format
    // "Hi there" is 2 tokens + 4 format
    // Total should be 11
    expect(tokenCount).toBe(11);
  });

  it("should handle empty messages", () => {
    const messages: IConversationHistoryMessage[] = [];
    const tokenCount = messageContextTokenCount.estimateTokenCount(messages);
    expect(tokenCount).toBe(0);
  });

  it("should handle messages with empty content", () => {
    const message: IConversationHistoryMessage = {
      role: "user",
      content: "",
    };

    const tokenCount =
      messageContextTokenCount.estimateTokenCountForMessage(message);
    // Should only count the message format tokens
    expect(tokenCount).toBe(4);
  });

  it("should estimate token count for plain text", () => {
    const text = "Hello world";
    const tokenCount = messageContextTokenCount.estimateTokenCountForText(text);
    // "Hello world" is 2 tokens
    expect(tokenCount).toBe(2);
  });
});
