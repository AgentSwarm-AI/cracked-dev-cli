import { IMessage } from "@services/LLM/ILLMProvider";
import { MessageContextManager } from "@services/LLM/MessageContextManager";
import { autoInjectable, singleton } from "tsyringe";

@singleton()
@autoInjectable()
export class ConversationContext {
  constructor(private messageContextManager: MessageContextManager) {}

  /**
   * Sets the current model being used. This is required for context window management.
   * @param model - The model identifier
   */
  async setCurrentModel(model: string): Promise<void> {
    this.messageContextManager.setCurrentModel(model);
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
    this.messageContextManager.addMessage(role, content);
  }

  /**
   * Retrieves all messages in the conversation history, including system instructions if set.
   * @returns An array of messages with system instructions first, if applicable.
   */
  getMessages(): IMessage[] {
    return this.messageContextManager.getMessages();
  }

  /**
   * Clears the conversation history and system instructions.
   */
  clear(): void {
    this.messageContextManager.clear();
  }

  /**
   * Sets the system instructions for the conversation.
   * @param instructions - The system instructions to set.
   */
  async setSystemInstructions(instructions: string): Promise<void> {
    this.messageContextManager.setSystemInstructions(instructions);
  }

  /**
   * Retrieves the current system instructions, if set.
   * @returns The system instructions or null if not set.
   */
  getSystemInstructions(): string | null {
    return this.messageContextManager.getSystemInstructions();
  }

  /**
   * Cleans up old messages if the context window is exceeded
   */
  private async cleanupContextIfNeeded(contextLength: number): Promise<void> {
    const currentModel = this.messageContextManager.getCurrentModel();
    if (!currentModel || !contextLength) {
      return;
    }

    // Reserve 20% of context window for new messages
    const maxTokens = Math.floor(contextLength * 0.8);
    this.messageContextManager.cleanupContext(maxTokens);
  }
}
