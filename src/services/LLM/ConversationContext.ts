import { autoInjectable, singleton } from "tsyringe";
import { IMessage } from "./ILLMProvider";

@singleton()
@autoInjectable()
export class ConversationContext {
  private conversationHistory: IMessage[] = [];
  private systemInstructions: string | null = null;

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
      return [{ role: "system", content: this.systemInstructions }, ...this.conversationHistory];
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
}