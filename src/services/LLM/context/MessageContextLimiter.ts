import { autoInjectable, singleton } from "tsyringe";
import { MessageContextCleaner } from "./MessageContextCleanup";
import { MessageContextStore } from "./MessageContextStore";

import { MessageContextLogger } from "./MessageContextLogger";

@singleton()
@autoInjectable()
export class MessageContextLimiter {
  constructor(
    private messageContextCleanup: MessageContextCleaner,
    private messageContextStore: MessageContextStore,
    private messageContextLogger: MessageContextLogger,
  ) {}

  public async cleanupContext(): Promise<boolean> {
    const wasCleaned = await this.messageContextCleanup.cleanupContext();

    if (wasCleaned) {
      this.updateLogFile();
      return true;
    }
    return false;
  }

  private updateLogFile(): void {
    // Skip logging in test environment or if disabled
    if (process.env.NODE_ENV === "test" || !this.isLoggingEnabled()) return;
    this.messageContextLogger.updateConversationHistory(
      this.messageContextStore.getContextData().conversationHistory,
      this.messageContextStore.getContextData().systemInstructions,
    );
  }

  private isLoggingEnabled(): boolean {
    return this.messageContextLogger.getConversationLogPath() !== null;
  }
}
