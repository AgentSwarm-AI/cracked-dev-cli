import { IMessage } from "@services/LLM/ILLMProvider";
import { MessageContextManager } from "@services/LLM/MessageContextManager";
import { DebugLogger } from "@services/logging/DebugLogger";
import { autoInjectable, singleton } from "tsyringe";

@singleton()
@autoInjectable()
export class ConversationContext {
  constructor(
    private messageContextManager: MessageContextManager,
    private debugLogger: DebugLogger,
  ) {}

  /**
   * Sets the current model being used. This is required for context window management.
   * @param model - The model identifier
   */
  async setCurrentModel(model: string): Promise<void> {
    this.messageContextManager.setCurrentModel(model);
    this.debugLogger.log("Context", "Model set in conversation context", {
      model,
    });
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
   * Clears the conversation history but preserves system instructions.
   */
  clear(): void {
    const systemInstructions =
      this.messageContextManager.getSystemInstructions();
    this.debugLogger.log("Context", "Clearing conversation context", {
      hasSystemInstructions: !!systemInstructions,
    });

    this.messageContextManager.clear();

    // Restore system instructions if they existed
    if (systemInstructions) {
      this.messageContextManager.setSystemInstructions(systemInstructions);
      this.debugLogger.log(
        "Context",
        "Restored system instructions after clear",
      );
    }
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
   * Gets the total token count for the current context
   * @returns The total number of tokens in the context
   */
  getTotalTokenCount(): number {
    return this.messageContextManager.getTotalTokenCount();
  }

  /**
   * Cleans up old messages if the context window is exceeded while preserving system instructions
   * and first user message
   * @returns true if cleanup was performed, false otherwise
   */
  async cleanupContext(): Promise<boolean> {
    this.debugLogger.log("Context", "Initiating context cleanup", {
      currentTokens: this.getTotalTokenCount(),
    });

    const wasCleanupPerformed =
      await this.messageContextManager.cleanupContext();

    if (wasCleanupPerformed) {
      this.debugLogger.log("Context", "Context cleanup completed", {
        newTokenCount: this.getTotalTokenCount(),
      });
    } else {
      this.debugLogger.log("Context", "No cleanup needed", {
        currentTokens: this.getTotalTokenCount(),
      });
    }

    return wasCleanupPerformed;
  }
}
