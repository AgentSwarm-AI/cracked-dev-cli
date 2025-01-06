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
      return true;
    }
    return false;
  }
}
