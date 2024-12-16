import { autoInjectable } from "tsyringe";
import { MessageContextStore } from "./MessageContextStore";

@autoInjectable()
export class MesssageContextTokenCount {
  constructor(private messageContextStore: MessageContextStore) {}

  estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  getTotalTokenCount(): number {
    const contextData = this.messageContextStore.getContextData();
    const history = contextData.conversationHistory;
    const systemInstructions = contextData.systemInstructions;
    let total = 0;

    if (systemInstructions) {
      total += this.estimateTokenCount(systemInstructions);
    }

    return history.reduce(
      (sum, message) => sum + this.estimateTokenCount(message.content),
      total,
    );
  }
}
