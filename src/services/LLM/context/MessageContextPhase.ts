// services/messageContext/MessageContextPhase.ts
import { autoInjectable, singleton } from "tsyringe";
import { PhaseManager } from "../PhaseManager";
import { MessageContextStore } from "./MessageContextStore";

import { MessageContextBuilder } from "./MessageContextBuilder";
import { MessageContextHistory } from "./MessageContextHistory";
import { MessageContextLogger } from "./MessageContextLogger";

@singleton()
@autoInjectable()
export class MessageContextPhase {
  constructor(
    private messageContextStore: MessageContextStore,
    private messageContextLogger: MessageContextLogger,
    private messageContextBuilder: MessageContextBuilder,
    private phaseManager: PhaseManager,
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

  private isLoggingEnabled(): boolean {
    return this.messageContextLogger.getConversationLogPath() !== null;
  }
}
