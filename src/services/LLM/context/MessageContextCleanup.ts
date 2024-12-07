import { IConversationHistoryMessage } from "@services/LLM/ILLMProvider";
import { singleton } from "tsyringe";
import { MessageContextBuilder } from "./MessageContextBuilder";

@singleton()
export class MessageContextCleanup {
  constructor(private contextBuilder: MessageContextBuilder) {}

  async cleanupContext(
    maxTokens: number,
    estimateTokenCount: (text: string) => number,
  ): Promise<boolean> {
    const history = this.contextBuilder.getConversationHistory();
    if (history.length === 0) {
      return false;
    }

    const totalTokens = history.reduce(
      (sum, msg) => sum + estimateTokenCount(msg.content),
      0,
    );

    if (totalTokens <= maxTokens) {
      return false;
    }

    // Keep only the most recent messages that fit within the token limit
    let currentTokens = 0;
    const keptMessages: IConversationHistoryMessage[] = [];

    // Process messages from newest to oldest
    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i];
      const cleanedContent = this.removeHtmlComments(msg.content);
      const msgTokens = estimateTokenCount(cleanedContent);
      if (currentTokens + msgTokens <= maxTokens) {
        keptMessages.unshift({ ...msg, content: cleanedContent });
        currentTokens += msgTokens;
      } else {
        break;
      }
    }

    // Save system instructions before clearing
    const systemInstructions = this.contextBuilder.getSystemInstructions();

    // Clear and rebuild context with kept messages
    this.contextBuilder.clear();
    
    // Restore system instructions
    if (systemInstructions) {
      this.contextBuilder.setSystemInstructions(systemInstructions);
    }

    // Add back kept messages
    keptMessages.forEach((msg) =>
      this.contextBuilder.addMessage(msg.role, msg.content),
    );

    return true;
  }

  private removeHtmlComments(text: string): string {
    return text.replace(/<!--[\s\S]*?-->/g, '');
  }
}