import { DebugLogger } from "@/services/logging/DebugLogger";
import { IConversationHistoryMessage } from "@services/LLM/ILLMProvider";
import { encode } from "gpt-tokenizer";
import { delay, inject, singleton } from "tsyringe";
import { ModelInfo } from "../ModelInfo";
import { MessageContextStore } from "./MessageContextStore";

@singleton()
export class MessageContextTokenCount {
  constructor(
    @inject(delay(() => MessageContextStore))
    private messageContextStore: MessageContextStore,
    @inject(delay(() => ModelInfo))
    private modelInfo: ModelInfo,
    private debugLogger: DebugLogger,
  ) {}

  public estimateTokenCount(messages: IConversationHistoryMessage[]): number {
    return messages.reduce((total, message) => {
      // Add 4 tokens for message format overhead
      return total + 4 + encode(message.content).length;
    }, 0);
  }

  public estimateTokenCountForMessage(
    message: IConversationHistoryMessage,
  ): number {
    // Add 4 tokens for message format overhead
    return 4 + encode(message.content).length;
  }

  public estimateTokenCountForText(text: string): number {
    return encode(text).length;
  }

  public getTotalTokenCount(): number {
    const contextData = this.messageContextStore.getContextData();
    let total = 0;
    if (contextData.systemInstructions) {
      total += this.estimateTokenCountForText(contextData.systemInstructions);
    }
    total += this.estimateTokenCount(contextData.conversationHistory);
    return total;
  }

  // Alias for getTotalTokenCount for backward compatibility
  public getTokenCount(): number {
    return this.getTotalTokenCount();
  }

  public async logContextUsage(): Promise<void> {
    const usedTokens = this.getTotalTokenCount();
    await this.modelInfo.logCurrentModelUsage(usedTokens);
  }
}
