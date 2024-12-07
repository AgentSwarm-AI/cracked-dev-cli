import { ConfigService } from "@services/ConfigService";
import { IConversationHistoryMessage } from "@services/LLM/ILLMProvider";
import { DebugLogger } from "@services/logging/DebugLogger";
import * as fs from "fs";
import * as path from "path";
import { singleton } from "tsyringe";

export interface IActionResult {
  success: boolean;
  error?: Error;
  result?: string;
}

@singleton()
export class MessageConversationLogger {
  private readonly logDirectory: string;
  private readonly conversationLogPath: string;
  private readonly conversationHistoryPath: string;

  constructor(
    private debugLogger: DebugLogger,
    private configService: ConfigService,
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
    this.ensureLogDirectoryExists();
    this.ensureHistoryFileExists();
    this.cleanupLogFiles();
  }

  private getLogDirectory(): string {
    const config = this.configService.getConfig();
    return config.logDirectory || "logs";
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
          "ConversationLogger",
          "Created conversation history file",
          { path: this.conversationHistoryPath },
        );
      }
    } catch (error) {
      this.debugLogger.log(
        "ConversationLogger",
        "Error creating conversation history file",
        { error, path: this.conversationHistoryPath },
      );
    }
  }

  cleanupLogFiles(): void {
    try {
      this.ensureLogDirectoryExists();
      fs.writeFileSync(this.conversationLogPath, "", "utf8");
      fs.writeFileSync(this.conversationHistoryPath, "[]", "utf8");
      this.debugLogger.log("ConversationLogger", "Log files cleaned up", {
        logDirectory: this.logDirectory,
      });
    } catch (error) {
      this.debugLogger.log(
        "ConversationLogger",
        "Error cleaning up log files",
        { error, logDirectory: this.logDirectory },
      );
    }
  }

  logMessage(message: IConversationHistoryMessage): void {
    try {
      this.ensureLogDirectoryExists();
      this.ensureHistoryFileExists();
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${message.role}: ${message.content}\\n`;
      fs.appendFileSync(this.conversationLogPath, logEntry, "utf8");
    } catch (error) {
      this.debugLogger.log("ConversationLogger", "Error writing to log file", {
        error,
        logDirectory: this.logDirectory,
      });
    }
  }

  logActionResult(action: string, result: IActionResult): void {
    try {
      this.ensureLogDirectoryExists();
      this.ensureHistoryFileExists();
      const timestamp = new Date().toISOString();
      const status = result.success ? "SUCCESS" : "FAILED";
      const details = result.error
        ? ` - Error: ${result.error.message}`
        : result.result
          ? ` - ${result.result}`
          : "";
      const logEntry = `[${timestamp}] ACTION ${action}: ${status}${details}\\n`;
      fs.appendFileSync(this.conversationLogPath, logEntry, "utf8");
    } catch (error) {
      this.debugLogger.log(
        "ConversationLogger",
        "Error writing action result to log file",
        { error, logDirectory: this.logDirectory },
      );
    }
  }

  updateConversationHistory(
    messages: IConversationHistoryMessage[],
    systemInstructions: string | null,
  ): void {
    try {
      this.ensureLogDirectoryExists();
      this.ensureHistoryFileExists();

      if (systemInstructions) {
        const timestamp = new Date().toISOString();
        fs.appendFileSync(
          this.conversationLogPath,
          `[${timestamp}] system: ${systemInstructions}\\n`,
          "utf8",
        );
      }

      messages.forEach((message) => {
        const timestamp = new Date().toISOString();
        fs.appendFileSync(
          this.conversationLogPath,
          `[${timestamp}] ${message.role}: ${message.content}\\n`,
          "utf8",
        );
      });

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

      this.debugLogger.log(
        "ConversationLogger",
        "Conversation history updated",
        {
          messagesCount: messages.length,
          hasSystemInstructions: !!systemInstructions,
          logDirectory: this.logDirectory,
        },
      );
    } catch (error) {
      this.debugLogger.log("ConversationLogger", "Error updating log files", {
        error,
        logDirectory: this.logDirectory,
      });
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
}