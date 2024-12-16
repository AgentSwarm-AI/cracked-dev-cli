import { DebugLogger } from "@/services/logging/DebugLogger";
import { singleton } from "tsyringe";
import { ModelInfo } from "../ModelInfo";
import { MessageContextBuilder } from "./MessageContextBuilder";
import { MessageContextHistory } from "./MessageContextHistory";
import { MessageContextStore } from "./MessageContextStore";

@singleton()
export class MessageContextCleaner {
  constructor(
    private debugLogger: DebugLogger,
    private modelInfo: ModelInfo,
    private messageContextStore: MessageContextStore,
    private messageContextBuilder: MessageContextBuilder,
    private messageContextHistory: MessageContextHistory,
  ) {}

  async cleanupContext(): Promise<boolean> {
    const contextData = this.messageContextStore.getContextData();
    const maxTokens = await this.modelInfo.getCurrentModelContextLength();

    const estimateTokenCount = (text: string) =>
      this.messageContextStore.estimateTokenCount(text);

    const messages = this.messageContextBuilder.getMessageContext(contextData);

    const currentTokens = messages.reduce(
      (sum, message) => sum + estimateTokenCount(message.content),
      0,
    );

    if (currentTokens <= maxTokens) {
      return false; // No cleanup needed
    }

    const cleanedHistory = [...messages];

    let cleanedTokens = currentTokens;

    while (cleanedTokens > maxTokens && cleanedHistory.length > 0) {
      const removedMessage = cleanedHistory.shift();
      if (removedMessage) {
        cleanedTokens -= estimateTokenCount(removedMessage.content);
      }
    }
    const removedHistory = messages.slice(
      0,
      messages.length - cleanedHistory.length,
    );

    if (removedHistory.length > 0) {
      const updatedHistory = contextData.conversationHistory.slice(
        removedHistory.length,
      );

      this.debugLogger.log("Context", "Context cleanup performed", {
        maxTokens,
        removedMessages: removedHistory.length,
      });

      await this.modelInfo.logCurrentModelUsage(
        this.messageContextStore.getTotalTokenCount(),
      );

      // Update history through the history service
      this.messageContextHistory.mergeConversationHistory();
      return true; // Cleanup was performed
    }
    return false; // No cleanup was performed
  }
}
