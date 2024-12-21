import { DebugLogger } from "@/services/logging/DebugLogger";
import { singleton } from "tsyringe";
import { ModelInfo } from "../ModelInfo";
import { MessageContextBuilder } from "./MessageContextBuilder";
import { MessageContextHistory } from "./MessageContextHistory";
import { MessageContextStore } from "./MessageContextStore";
import { MessageContextTokenCount } from "./MessageContextTokenCount";

@singleton()
export class MessageContextCleaner {
  constructor(
    private debugLogger: DebugLogger,
    private modelInfo: ModelInfo,
    private messageContextStore: MessageContextStore,
    private messageContextBuilder: MessageContextBuilder,
    private messageContextHistory: MessageContextHistory,
    private messageContextTokenCount: MessageContextTokenCount,
  ) {}

  async cleanupContext(): Promise<boolean> {
    const contextData = this.messageContextStore.getContextData();
    const maxTokens = await this.modelInfo.getCurrentModelContextLength();
    const messages = this.messageContextBuilder.getMessageContext(contextData);
    const currentTokens =
      this.messageContextTokenCount.estimateTokenCount(messages);

    if (currentTokens <= maxTokens) {
      return false; // No cleanup needed
    }

    const cleanedHistory = [...messages];
    let cleanedTokens = currentTokens;

    while (cleanedTokens > maxTokens && cleanedHistory.length > 0) {
      const removedMessage = cleanedHistory.shift();
      if (removedMessage) {
        cleanedTokens -=
          this.messageContextTokenCount.estimateTokenCountForMessage(
            removedMessage,
          );
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

      // Update the context data with the cleaned history
      this.messageContextStore.setContextData({
        ...contextData,
        conversationHistory: updatedHistory,
      });

      this.debugLogger.log("Context", "Context cleanup performed", {
        maxTokens,
        removedMessages: removedHistory.length,
      });

      await this.modelInfo.logCurrentModelUsage(
        this.messageContextStore.getTotalTokenCount(),
      );

      return true; // Cleanup was performed
    }
    return false; // No cleanup was performed
  }
}
