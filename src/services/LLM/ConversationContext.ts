import { IMessage } from "@services/LLM/ILLMProvider";
import { LLMProvider, LLMProviderType } from "@services/LLM/LLMProvider";
import { autoInjectable, singleton } from "tsyringe";

@singleton()
@autoInjectable()
export class ConversationContext {
  private conversationHistory: IMessage[] = [];
  private systemInstructions: string | null = null;
  private currentModel: string | null = null;

  /**
   * Sets the current model being used. This is required for context window management.
   * @param model - The model identifier
   */
  async setCurrentModel(model: string): Promise<void> {
    this.currentModel = model;
    await this.cleanupContextIfNeeded();
  }

  /**
   * Adds a message to the conversation history.
   * @param role - The role of the message sender, either "user", "assistant", or "system".
   * @param content - The content of the message.
   * @throws Will throw an error if the role is invalid.
   * @throws Will throw an error if the content is empty.
   */
  async addMessage(
    role: "user" | "assistant" | "system",
    content: string,
  ): Promise<void> {
    if (!["user", "assistant", "system"].includes(role)) {
      throw new Error(`Invalid role: ${role}`);
    }
    if (content.trim() === "") {
      throw new Error("Content cannot be empty");
    }
    this.conversationHistory.push({ role, content });
    await this.cleanupContextIfNeeded();
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
  async setSystemInstructions(instructions: string): Promise<void> {
    this.systemInstructions = instructions;
    await this.cleanupContextIfNeeded();
  }

  /**
   * Retrieves the current system instructions, if set.
   * @returns The system instructions or null if not set.
   */
  getSystemInstructions(): string | null {
    return this.systemInstructions;
  }

  /**
   * Estimates the number of tokens in a string using a simple heuristic.
   * This is a rough approximation - actual token count may vary by model.
   * @param text - The text to estimate tokens for
   * @returns Estimated number of tokens
   */
  private estimateTokenCount(text: string): number {
    // Simple heuristic: ~4 characters per token on average
    return Math.ceil(text.length / 4);
  }

  /**
   * Gets the total estimated token count for all messages
   * @returns Estimated total tokens
   */
  private getTotalTokenCount(): number {
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
   * Cleans up old messages if the context window is exceeded
   */
  private async cleanupContextIfNeeded(): Promise<void> {
    if (!this.currentModel) {
      return; // Can't cleanup without knowing the model
    }

    try {
      const llmProvider = LLMProvider.getInstance(LLMProviderType.OpenRouter);
      const modelInfo = await llmProvider.getModelInfo(this.currentModel);
      const contextLength = modelInfo.context_length as number;

      if (!contextLength) {
        return; // Can't cleanup without context length
      }

      // Reserve 20% of context window for new messages
      const maxTokens = Math.floor(contextLength * 0.8);

      while (
        this.getTotalTokenCount() > maxTokens &&
        this.conversationHistory.length > 0
      ) {
        // Remove oldest message first, preserving most recent context
        this.conversationHistory.shift();
      }
    } catch (error) {
      console.warn("Failed to cleanup context:", error);
    }
  }
}
