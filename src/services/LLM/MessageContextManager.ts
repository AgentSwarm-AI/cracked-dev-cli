import { IMessage } from "@services/LLM/ILLMProvider";
import { DebugLogger } from "@services/logging/DebugLogger";
import { autoInjectable, singleton } from "tsyringe";

@singleton()
@autoInjectable()
export class MessageContextManager {
  private conversationHistory: IMessage[] = [];
  private systemInstructions: string | null = null;
  private currentModel: string | null = null;

  constructor(private debugLogger: DebugLogger) {}

  setCurrentModel(model: string): void {
    this.currentModel = model;
    this.debugLogger.log("Context", "Model updated", { model });
  }

  addMessage(role: "user" | "assistant" | "system", content: string): boolean {
    if (!["user", "assistant", "system"].includes(role)) {
      throw new Error(`Invalid role: ${role}`);
    }
    if (content.trim() === "") {
      throw new Error("Content cannot be empty");
    }

    this.conversationHistory.push({ role, content });

    return true;
  }

  getMessages(): IMessage[] {
    if (this.systemInstructions) {
      return [
        { role: "system", content: this.systemInstructions },
        ...this.conversationHistory,
      ];
    }
    return this.conversationHistory.slice();
  }

  clear(): void {
    const hadMessages = this.conversationHistory.length > 0;
    const hadInstructions = this.systemInstructions !== null;

    this.conversationHistory = [];
    this.systemInstructions = null;

    this.debugLogger.log("Context", "Context cleared", {
      clearedMessages: hadMessages,
      clearedInstructions: hadInstructions,
    });
  }

  setSystemInstructions(instructions: string): void {
    const hadPreviousInstructions = this.systemInstructions !== null;
    this.systemInstructions = instructions;
    this.debugLogger.log("Context", "System instructions updated", {
      hadPreviousInstructions,
      instructionsLength: instructions.length,
    });
  }

  getSystemInstructions(): string | null {
    return this.systemInstructions;
  }

  getCurrentModel(): string | null {
    return this.currentModel;
  }

  estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  getTotalTokenCount(): number {
    let total = 0;

    if (this.systemInstructions) {
      total += this.estimateTokenCount(this.systemInstructions);
    }

    for (const message of this.conversationHistory) {
      total += this.estimateTokenCount(message.content);
    }

    return total;
  }

  private getConversationTokenCount(): number {
    return this.conversationHistory.reduce(
      (total, message) => total + this.estimateTokenCount(message.content),
      0,
    );
  }

  cleanupContext(maxTokens: number): boolean {
    if (this.conversationHistory.length === 0) {
      return false;
    }

    const systemTokens = this.systemInstructions
      ? this.estimateTokenCount(this.systemInstructions)
      : 0;
    const availableTokens = maxTokens - systemTokens;

    let conversationTokens = this.getConversationTokenCount();
    if (conversationTokens <= availableTokens) {
      return false;
    }

    const initialMessageCount = this.conversationHistory.length;
    while (
      conversationTokens > availableTokens &&
      this.conversationHistory.length > 0
    ) {
      const oldestMessage = this.conversationHistory[0];
      const oldestTokens = this.estimateTokenCount(oldestMessage.content);
      this.conversationHistory.shift();
      conversationTokens -= oldestTokens;
    }

    const removedCount = initialMessageCount - this.conversationHistory.length;
    this.debugLogger.log("Context", "Context cleanup performed", {
      maxTokens,
      systemTokens,
      initialMessageCount,
      remainingMessages: this.conversationHistory.length,
      removedMessages: removedCount,
    });

    return true;
  }
}
