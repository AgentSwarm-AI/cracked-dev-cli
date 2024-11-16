import { autoInjectable, singleton } from "tsyringe";
import { IMessage } from "./ILLMProvider";

@singleton()
@autoInjectable()
export class ConversationContext {
  private conversationHistory: IMessage[] = [];
  private systemInstructions: string | null = null;

  addMessage(role: "user" | "assistant" | "system", content: string): void {
    this.conversationHistory.push({ role, content });
  }

  getMessages(): IMessage[] {
    const messages = [...this.conversationHistory];
    if (this.systemInstructions) {
      messages.unshift({ role: "system", content: this.systemInstructions });
    }
    return messages;
  }

  clear(): void {
    this.conversationHistory = [];
    this.systemInstructions = null;
  }

  setSystemInstructions(instructions: string): void {
    this.systemInstructions = instructions;
  }
}
