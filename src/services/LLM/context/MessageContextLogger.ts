import { ConfigService } from "@services/ConfigService";
import { IConversationHistoryMessage } from "@services/LLM/ILLMProvider";
import { DebugLogger } from "@services/logging/DebugLogger";
import * as fs from "fs";
import * as path from "path";
import { inject, singleton } from "tsyringe";
import { MessageContextBuilder } from "./MessageContextBuilder";
import { MessageContextStore } from "./MessageContextStore";

export interface MessageIActionResult {
  success: boolean;
  error?: Error;
  result?: string;
}

@singleton()
export class MessageContextLogger {
  private readonly logDirectory: string;
  private readonly conversationLogPath: string;
  private readonly conversationHistoryPath: string;
  private readonly logLock: Promise<void>;
  private isLogging: boolean;

  constructor(
    private debugLogger: DebugLogger,
    private configService: ConfigService,
    @inject(MessageContextBuilder)
    private messageContextBuilder: MessageContextBuilder,
    @inject(MessageContextStore)
    private messageContextStore: MessageContextStore,
  ) {
    this.logDirectory = this.getLogDirectory();
    this.conversationLogPath = path.join(
      process.cwd(),
      this.logDirectory,
      "conversation.log",
    );
    this.conversationHistoryPath = path.join(
      process.cwd(),
      this.logDirectory,
      "conversationHistory.json",
    );
    this.isLogging = false;
    this.logLock = Promise.resolve();
    this.ensureLogDirectoryExists();
    this.ensureHistoryFileExists();
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
    const logDir = path.dirname(this.conversationLogPath);
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
    try {
      await this.acquireLogLock();
      this.ensureLogDirectoryExists();
      fs.writeFileSync(this.conversationLogPath, "", "utf8");
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

  async logMessage(message: IConversationHistoryMessage): Promise<void> {
    if (!this.isLoggingEnabled()) return;
    try {
      await this.acquireLogLock();
      this.ensureLogDirectoryExists();
      this.ensureHistoryFileExists();
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${message.role}: ${message.content}\n`;
      fs.appendFileSync(this.conversationLogPath, logEntry, "utf8");
      this.debugLogger.log("MessageLogger", "Message logged", { message });
    } catch (error) {
      this.debugLogger.log("MessageLogger", "Error writing to log file", {
        error,
        logDirectory: this.logDirectory,
      });
    } finally {
      this.releaseLogLock();
    }
  }

  async logActionResult(
    action: string,
    result: MessageIActionResult,
  ): Promise<void> {
    if (!this.isLoggingEnabled()) return;
    try {
      await this.acquireLogLock();
      this.ensureLogDirectoryExists();
      this.ensureHistoryFileExists();
      const timestamp = new Date().toISOString();
      const status = result.success ? "SUCCESS" : "FAILED";
      const details = result.error
        ? ` - Error: ${result.error.message}`
        : result.result
          ? ` - ${result.result}`
          : "";
      const logEntry = `[${timestamp}] ACTION ${action}: ${status}${details}\n`;
      fs.appendFileSync(this.conversationLogPath, logEntry, "utf8");

      // Update operation result in context
      const contextData = this.messageContextStore.getContextData();
      const updatedContextData =
        this.messageContextBuilder.updateOperationResult(
          action as any,
          action,
          result.result || "",
          contextData,
          result.success,
          result.error?.message,
        );
      this.messageContextStore.setContextData(updatedContextData);
    } catch (error) {
      this.debugLogger.log(
        "MessageLogger",
        "Error writing action result to log file",
        { error, logDirectory: this.logDirectory },
      );
    } finally {
      this.releaseLogLock();
    }
  }

  async updateConversationHistory(
    messages: IConversationHistoryMessage[],
    systemInstructions: string | null,
  ): Promise<void> {
    if (!this.isLoggingEnabled()) return;
    try {
      await this.acquireLogLock();
      this.ensureLogDirectoryExists();
      this.ensureHistoryFileExists();

      if (systemInstructions) {
        const timestamp = new Date().toISOString();
        fs.appendFileSync(
          this.conversationLogPath,
          `[${timestamp}] system: ${systemInstructions}\n`,
          "utf8",
        );
      }

      for (const message of messages) {
        const timestamp = new Date().toISOString();
        fs.appendFileSync(
          this.conversationLogPath,
          `[${timestamp}] ${message.role}: ${message.content}\n`,
          "utf8",
        );
      }

      const historyData = {
        timestamp: new Date().toISOString(),
        systemInstructions,
        messages,
      };

      fs.writeFileSync(
        this.conversationHistoryPath,
        JSON.stringify(historyData, null, 2),
        "utf8",
      );

      this.debugLogger.log("MessageLogger", "Conversation history updated", {
        messagesCount: messages.length,
        hasSystemInstructions: !!systemInstructions,
        logDirectory: this.logDirectory,
      });
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

  getConversationLogPath(): string {
    return this.conversationLogPath;
  }

  getConversationHistoryPath(): string {
    return this.conversationHistoryPath;
  }

  async getConversationHistory(): Promise<IConversationHistoryMessage[]> {
    try {
      await this.acquireLogLock();
      const historyData = fs.readFileSync(this.conversationHistoryPath, "utf8");
      return JSON.parse(historyData).messages;
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
