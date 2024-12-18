// services/messageContext/MessageContextPhase.ts
import { autoInjectable, singleton } from "tsyringe";
import { MessageContextStore } from "./MessageContextStore";

import { MessageContextHistory } from "./MessageContextHistory";

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
      conversationHistory: [...currentData.conversationHistory],
      systemInstructions: currentData.systemInstructions,
    });

    this.messageContextHistory.updateLogFile();
  }
}
