// services/messageContext/MessageContextPhase.ts
import { IConversationHistoryMessage } from "@services/LLM/ILLMProvider";
import { autoInjectable, singleton } from "tsyringe";
import { MessageContextHistory } from "./MessageContextHistory";
import { MessageContextStore } from "./MessageContextStore";

@singleton()
@autoInjectable()
export class MessageContextPhase {
  constructor(
    private messageContextStore: MessageContextStore,
    private messageContextHistory: MessageContextHistory,
  ) {}

  public cleanupPhaseContent(): void {
    const currentData = this.messageContextStore.getContextData();

    // Clear all previous phase instructions when transitioning
    this.messageContextStore.setContextData({
      phaseInstructions: new Map(),
      fileOperations: new Map(currentData.fileOperations),
      commandOperations: new Map(currentData.commandOperations),
      conversationHistory: this.cleanPhaseRelatedMessages(
        currentData.conversationHistory,
      ),
      systemInstructions: currentData.systemInstructions,
    });
  }

  private cleanPhaseRelatedMessages(
    messages: IConversationHistoryMessage[],
  ): IConversationHistoryMessage[] {
    return messages
      .map((message) => ({
        ...message,
        content: message.content.replace(
          /<phase_prompt>[\s\S]*?<\/phase_prompt>/g,
          "",
        ),
      }))
      .filter((message) => message.content.trim().length > 0);
  }
}
