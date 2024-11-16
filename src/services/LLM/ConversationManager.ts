import { autoInjectable } from "tsyringe";
import { IMessage } from "./ILLMProvider";
import { LLMContextCreator } from "./LLMContextCreator";
import { LLMProvider, LLMProviderType } from "./LLMProvider";

@autoInjectable()
export class ConversationManager {
  private conversationHistory: IMessage[] = [];
  private systemInstructions: string | null = null;

  constructor(private contextCreator: LLMContextCreator) {}

  async handleMessage(message: string, root: string): Promise<string> {
    const context = await this.contextCreator.create(message, root);
    const provider = LLMProvider.getInstance(LLMProviderType.OpenRouter);
    const response = await provider.sendMessage("default", context);

    // Extract content between task_objective_completed tags if present
    const completionMatch = response.match(
      /<task_objective_completed>([\s\S]*?)<\/task_objective_completed>/,
    );
    if (completionMatch) {
      const completionContent = completionMatch[1].trim();
      return `🎯 Task Objective Completed! 🎉\n\n${completionContent}\n\nSession ended successfully. ✨`;
    }

    // Handle actions in the response
    await this.contextCreator.parseAndExecuteActions(response);
    return response;
  }

  addMessage(role: "user" | "assistant" | "system", content: string): void {
    this.conversationHistory.push({ role, content });
  }

  getConversationHistory(): IMessage[] {
    const history = [...this.conversationHistory];
    if (this.systemInstructions) {
      history.unshift({ role: "system", content: this.systemInstructions });
    }
    return history;
  }

  clearHistory(): void {
    this.conversationHistory = [];
    this.systemInstructions = null;
  }

  setSystemInstructions(instructions: string): void {
    this.systemInstructions = instructions;
  }
}
