import { singleton } from "tsyringe";
import { IMessage } from "./ILLMProvider";

@singleton()
export class ConversationManager {
  private conversationHistory: IMessage[] = [];

  addMessage(role: "user" | "assistant" | "system", content: string): void {
    this.conversationHistory.push({ role, content });
  }

  getConversationHistory(): IMessage[] {
    return [...this.conversationHistory];
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }

  setSystemInstructions(instructions: string): void {
    this.conversationHistory = [
      { role: "system", content: instructions },
      ...this.conversationHistory.filter((msg) => msg.role !== "system"),
    ];
  }
}
