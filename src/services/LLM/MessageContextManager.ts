import { IMessage } from "@services/LLM/ILLMProvider";
import { autoInjectable, singleton } from "tsyringe";

@singleton()
@autoInjectable()
export class MessageContextManager {
  private conversationHistory: IMessage[] = [];
  private systemInstructions: string | null = null;
  private currentModel: string | null = null;

  /**
   * Sets the current model being used. This is required for context window management.
   * @param model - The model identifier
   */
  setCurrentModel(model: string): void {
    this.currentModel = model;
  }

  /**
   * Adds a message to the conversation history.
   * @param role - The role of the message sender, either "user", "assistant", or "system".
   * @param content - The content of the message.
   * @throws Will throw an error if the role is invalid.
   * @throws Will throw an error if the content is empty.
   */
  addMessage(role: "user" | "assistant" | "system", content: string): void {
    if (!["user", "assistant", "system"].includes(role)) {
      throw new Error(`Invalid role: ${role}`);
    }
    if (content.trim() === "") {
      throw new Error("Content cannot be empty");
    }
    this.conversationHistory.push({ role, content });
  }

  /**
   * Retrieves all messages in the conversation history, including system instructions if set.
   * @returns An array of messages with system instructions first, if applicable.
   */
  getMessages(): IMessage[] {
    if (this.systemInstructions) {
      return [
        { role: "system", content: this.systemInstructions },
        ...this.conversationHistory,
      ];
    }
    return this.conversationHistory.slice();
  }

  /**
   * Clears the conversation history and system instructions.
   */
  clear(): void {
    this.conversationHistory = [];
    this.systemInstructions = null;
  }

  /**
   * Sets the system instructions for the conversation.
   * @param instructions - The system instructions to set.
   */
  setSystemInstructions(instructions: string): void {
    this.systemInstructions = instructions;
  }

  /**
   * Retrieves the current system instructions, if set.
   * @returns The system instructions or null if not set.
   */
  getSystemInstructions(): string | null {
    return this.systemInstructions;
  }

  /**
   * Gets the current model being used.
   * @returns The current model or null if not set.
   */
  getCurrentModel(): string | null {
    return this.currentModel;
  }

  /**
   * Estimates the number of tokens in a string using a simple heuristic.
   * This is a rough approximation - actual token count may vary by model.
   * @param text - The text to estimate tokens for
   * @returns Estimated number of tokens
   */
  estimateTokenCount(text: string): number {
    // Simple heuristic: ~4 characters per token on average
    return Math.ceil(text.length / 4);
  }

  /**
   * Gets the total estimated token count for all messages
   * @returns Estimated total tokens
   */
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

  /**
   * Removes oldest messages until total token count is below or equal to maxTokens
   * @param maxTokens - Maximum number of tokens to allow
   */
  cleanupContext(maxTokens: number): void {
    // If we have system instructions, reserve their tokens from the max
    const systemTokens = this.systemInstructions
      ? this.estimateTokenCount(this.systemInstructions)
      : 0;
    const availableTokens = maxTokens - systemTokens;

    // If we have no messages or already under limit, return early
    if (this.conversationHistory.length === 0 || this.getTotalTokenCount() <= maxTokens) return;

    // Start from the beginning and remove messages until we are under the limit
    let totalTokens = 0;
    let i = 0;

    // Count tokens from oldest to newest
    while (i < this.conversationHistory.length) {
      const tokens = this.estimateTokenCount(this.conversationHistory[i].content);
      if (totalTokens + tokens <= availableTokens) {
        totalTokens += tokens;
        i++;
      } else {
        break;
      }
    }

    // Remove messages that do not fit
    this.conversationHistory = this.conversationHistory.slice(i);
  }
}