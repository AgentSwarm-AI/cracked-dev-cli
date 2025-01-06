import { ConfigService } from "@services/ConfigService";
import { IConversationHistoryMessage } from "@services/LLM/ILLMProvider";
import { DebugLogger } from "@services/logging/DebugLogger";
import * as fs from "fs";
import * as path from "path";
import { container, singleton } from "tsyringe";
import { MessageContextHistory } from "./MessageContextHistory";
import { MessageContextStore } from "./MessageContextStore";

export interface MessageIActionResult {
  success: boolean;
  error?: Error;
  result?: string;
}

@singleton()
export class MessageContextLogger {
  private readonly logDirectory: string;
  private readonly conversationHistoryPath: string;
  private readonly logLock: Promise<void>;
  private isLogging: boolean;

  constructor(
    private debugLogger: DebugLogger,
    private configService: ConfigService,
    private messageContextStore: MessageContextStore,
  ) {
    this.logDirectory = this.getLogDirectory();
    this.conversationHistoryPath = path.join(
      process.cwd(),
      this.logDirectory,
      "conversationHistory.json",
    );
    this.isLogging = false;
    this.logLock = Promise.resolve();
    if (this.isLoggingEnabled()) {
      this.ensureLogDirectoryExists();
      this.ensureHistoryFileExists();
    }
  }

  private getLogDirectory(): string {
    const config = this.configService.getConfig();
    return config.logDirectory || "logs";
  }

  private async acquireLogLock(): Promise<void> {
    while (this.isLogging) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    this.isLogging = true;
  }

  private releaseLogLock(): void {
    this.isLogging = false;
  }

  private ensureLogDirectoryExists(): void {
    const logDir = path.dirname(this.conversationHistoryPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  private ensureHistoryFileExists(): void {
    try {
      if (!fs.existsSync(this.conversationHistoryPath)) {
        fs.writeFileSync(this.conversationHistoryPath, "[]", "utf8");
        this.debugLogger.log(
          "MessageLogger",
          "Created conversation history file",
          { path: this.conversationHistoryPath },
        );
      }
    } catch (error) {
      this.debugLogger.log(
        "MessageLogger",
        "Error creating conversation history file",
        { error, path: this.conversationHistoryPath },
      );
    }
  }

  async cleanupLogFiles(): Promise<void> {
    if (!this.isLoggingEnabled()) return;
    try {
      await this.acquireLogLock();
      this.ensureLogDirectoryExists();
      fs.writeFileSync(this.conversationHistoryPath, "[]", "utf8");
      this.debugLogger.log("MessageLogger", "Log files cleaned up", {
        logDirectory: this.logDirectory,
      });
    } catch (error) {
      this.debugLogger.log("MessageLogger", "Error cleaning up log files", {
        error,
        logDirectory: this.logDirectory,
      });
    } finally {
      this.releaseLogLock();
    }
  }

  private isLoggingEnabled(): boolean {
    const config = this.configService.getConfig();
    return config.enableConversationLog === true;
  }

  async updateConversationHistory(): Promise<void> {
    const messageContextHistory = container.resolve(MessageContextHistory);

    const messages = messageContextHistory.getMessages();
    const systemInstructions = messageContextHistory.getSystemInstructions();

    if (!this.isLoggingEnabled()) {
      this.debugLogger.log("MessageLogger", "Logging disabled");
      return;
    }

    try {
      await this.acquireLogLock();
      this.ensureLogDirectoryExists();
      this.ensureHistoryFileExists();

      const historyEntry = {
        timestamp: new Date().toISOString(),
        systemInstructions,
        messages,
      };

      fs.writeFileSync(
        this.conversationHistoryPath,
        JSON.stringify([historyEntry], null, 2),
        "utf8",
      );
    } catch (error) {
      this.debugLogger.log("MessageLogger", "Error updating log files", {
        error,
        logDirectory: this.logDirectory,
      });
    } finally {
      this.releaseLogLock();
    }
  }

  getLogDirectoryPath(): string {
    return this.logDirectory;
  }

  getConversationHistoryPath(): string {
    return this.conversationHistoryPath;
  }

  async getConversationHistory(): Promise<IConversationHistoryMessage[]> {
    try {
      await this.acquireLogLock();
      const historyData = fs.readFileSync(this.conversationHistoryPath, "utf8");
      const history = JSON.parse(historyData);
      if (history.length === 0) return [];
      // Return messages from the latest history entry
      return history[history.length - 1].messages || [];
    } catch (error) {
      this.debugLogger.log(
        "MessageLogger",
        "Error reading conversation history",
        { error, logDirectory: this.logDirectory },
      );
      return [];
    } finally {
      this.releaseLogLock();
    }
  }
}
