import { IMessage } from "@services/LLM/ILLMProvider";
import { autoInjectable, singleton } from "tsyringe";

@singleton()
@autoInjectable()
export class MessageContextManager {
  private conversationHistory: IMessage[] = [];
  private systemInstructions: string | null = null;
  private currentModel: string | null = null;

  /** Sets the current model being used. This is required for context window management. */
  setCurrentModel(model: string): void {
    this.currentModel = model;
  }

  /** Checks if a message is similar to an existing one to prevent duplicates */
  private isDuplicate(role: string, content: string): boolean {
    return this.conversationHistory.some(
      (msg) => msg.role === role && msg.content.trim() === content.trim(),
    );
  }

  /** Adds a message to the conversation history. */
  addMessage(role: "user" | "assistant" | "system", content: string): boolean {
    if (!["user", "assistant", "system"].includes(role)) {
      throw new Error(`Invalid role: ${role}`);
    }
    if (content.trim() === "") {
      throw new Error("Content cannot be empty");
    }

    // Skip duplicate messages
    if (this.isDuplicate(role, content)) {
      return false;
    }

    this.conversationHistory.push({ role, content });
    return true;
  }

  /** Retrieves all messages in the conversation history, including system instructions if set. */
  getMessages(): IMessage[] {
    if (this.systemInstructions) {
      return [
        { role: "system", content: this.systemInstructions },
        ...this.conversationHistory,
      ];
    }
    return this.conversationHistory.slice();
  }

  /** Clears the conversation history and system instructions. */
  clear(): void {
    this.conversationHistory = [];
    this.systemInstructions = null;
  }

  /** Sets the system instructions for the conversation. */
  setSystemInstructions(instructions: string): void {
    this.systemInstructions = instructions;
  }

  /** Retrieves the current system instructions, if set. */
  getSystemInstructions(): string | null {
    return this.systemInstructions;
  }

  /** Gets the current model being used. */
  getCurrentModel(): string | null {
    return this.currentModel;
  }

  /** Estimates the number of tokens in a string using a simple heuristic. */
  estimateTokenCount(text: string): number {
    // Simple heuristic: ~4 characters per token on average
    return Math.ceil(text.length / 4);
  }

  /** Gets the total estimated token count for all messages */
  getTotalTokenCount(): number {
    let total = 0;

    // Count system instructions if present
    if (this.systemInstructions) {
      total += this.estimateTokenCount(this.systemInstructions);
    }

    // Count conversation history
    for (const message of this.conversationHistory) {
      total += this.estimateTokenCount(message.content);
    }

    return total;
  }

  /** Removes oldest messages until total token count is below or equal to maxTokens */
  cleanupContext(maxTokens: number): boolean {
    // If we have system instructions, reserve their tokens from the max
    const systemTokens = this.systemInstructions
      ? this.estimateTokenCount(this.systemInstructions)
      : 0;
    const availableTokens = maxTokens - systemTokens;

    // If we have no messages or already under limit, return early
    if (
      this.conversationHistory.length === 0 ||
      this.getTotalTokenCount() <= maxTokens
    ) {
      return false;
    }

    // Remove oldest messages until total tokens are within the limit
    let totalTokens = this.getTotalTokenCount();
    while (
      this.conversationHistory.length > 0 &&
      totalTokens > maxTokens
    ) {
      const removedMessage = this.conversationHistory.shift();
      if (removedMessage) {
        totalTokens -= this.estimateTokenCount(removedMessage.content);
      }
    }

    return true;
  }
}