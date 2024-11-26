import { IMessage } from "@services/LLM/ILLMProvider";
import { ModelInfo } from "@services/LLM/ModelInfo";
import { DebugLogger } from "@services/logging/DebugLogger";
import * as fs from "fs";
import * as path from "path";
import { autoInjectable, singleton } from "tsyringe";

interface FileOperation {
  type: "read_file" | "write_file";
  path: string;
}

@singleton()
@autoInjectable()
export class MessageContextManager {
  private conversationHistory: IMessage[] = [];
  private systemInstructions: string | null = null;
  private currentModel: string | null = null;
  private readonly logPath = path.join(
    process.cwd(),
    "logs",
    "conversation.log",
  );

  constructor(
    private debugLogger: DebugLogger,
    private modelInfo: ModelInfo,
  ) {
    // Clean up log file on startup, but not in test environment
    if (process.env.NODE_ENV !== "test") {
      this.cleanupLogFile();
    }
  }

  private cleanupLogFile(): void {
    try {
      fs.writeFileSync(this.logPath, "", "utf8");
    } catch (error) {
      this.debugLogger.log("Context", "Error cleaning up log file", { error });
    }
  }

  private logMessage(message: IMessage): void {
    // Skip logging in test environment
    if (process.env.NODE_ENV === "test") return;

    try {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${message.role}: ${message.content}\n`;
      fs.appendFileSync(this.logPath, logEntry, "utf8");
    } catch (error) {
      this.debugLogger.log("Context", "Error writing to log file", { error });
    }
  }

  private updateLogFile(): void {
    // Skip logging in test environment
    if (process.env.NODE_ENV === "test") return;

    try {
      // Clear the log file
      fs.writeFileSync(this.logPath, "", "utf8");

      // Write system instructions if present
      if (this.systemInstructions) {
        const timestamp = new Date().toISOString();
        fs.appendFileSync(
          this.logPath,
          `[${timestamp}] system: ${this.systemInstructions}\n`,
          "utf8",
        );
      }

      // Write all conversation messages
      this.conversationHistory.forEach((message) => {
        const timestamp = new Date().toISOString();
        fs.appendFileSync(
          this.logPath,
          `[${timestamp}] ${message.role}: ${message.content}\n`,
          "utf8",
        );
      });
    } catch (error) {
      this.debugLogger.log("Context", "Error updating log file", { error });
    }
  }

  private extractFileOperations(content: string): FileOperation[] {
    const operations: FileOperation[] = [];

    // Extract write_file operations
    const writeMatches = Array.from(
      content.matchAll(/<write_file>[\s\S]*?<path>(.*?)<\/path>/g),
    );
    writeMatches.forEach((match) => {
      if (match[1]) {
        operations.push({
          type: "write_file",
          path: match[1],
        });
      }
    });

    // Extract read_file operations
    const readMatches = Array.from(
      content.matchAll(/<read_file>[\s\S]*?<path>(.*?)<\/path>/g),
    );
    readMatches.forEach((match) => {
      if (match[1]) {
        operations.push({
          type: "read_file",
          path: match[1],
        });
      }
    });

    return operations;
  }

  private removeOldFileOperations(newMessage: IMessage): void {
    this.debugLogger.log("Context", "Removing old file operations");

    const newOperations = this.extractFileOperations(newMessage.content);
    if (newOperations.length === 0) return;

    this.conversationHistory = this.conversationHistory.filter((msg) => {
      // Keep non-file operation messages
      if (
        !msg.content.includes("<read_file>") &&
        !msg.content.includes("<write_file>")
      ) {
        return true;
      }

      const msgOperations = this.extractFileOperations(msg.content);

      // Remove message only if ALL its operations are superseded by new operations
      return !msgOperations.every((msgOp) =>
        newOperations.some(
          (newOp) => newOp.type === msgOp.type && newOp.path === msgOp.path,
        ),
      );
    });

    // Update the log file with current conversation history
    this.updateLogFile();
  }

  setCurrentModel(model: string): void {
    this.currentModel = model;
    this.modelInfo.setCurrentModel(model);
    this.debugLogger.log("Context", "Model updated", { model });
  }

  addMessage(role: "user" | "assistant" | "system", content: string): boolean {
    if (!["user", "assistant", "system"].includes(role)) {
      throw new Error(`Invalid role: ${role}`);
    }
    if (content.trim() === "") {
      throw new Error("Content cannot be empty");
    }

    const message = { role, content };

    // Remove old file operations for the same path and type before adding new message
    if (role === "user" || role === "assistant") {
      this.removeOldFileOperations(message);
    }

    this.conversationHistory.push(message);
    this.logMessage(message);

    return true;
  }

  getMessages(): IMessage[] {
    if (this.systemInstructions) {
      return [
        { role: "system", content: this.systemInstructions },
        ...this.conversationHistory,
      ];
    }
    return this.conversationHistory.slice();
  }

  clear(): void {
    const hadMessages = this.conversationHistory.length > 0;
    const hadInstructions = this.systemInstructions !== null;

    this.conversationHistory = [];
    this.systemInstructions = null;

    // Update the log file when clearing context
    this.updateLogFile();

    this.debugLogger.log("Context", "Context cleared", {
      clearedMessages: hadMessages,
      clearedInstructions: hadInstructions,
    });
  }

  setSystemInstructions(instructions: string): void {
    const hadPreviousInstructions = this.systemInstructions !== null;
    this.systemInstructions = instructions;

    // Update the log file when system instructions change
    this.updateLogFile();

    this.debugLogger.log("Context", "System instructions updated", {
      hadPreviousInstructions,
      instructionsLength: instructions.length,
    });
  }

  getSystemInstructions(): string | null {
    return this.systemInstructions;
  }

  getCurrentModel(): string | null {
    return this.currentModel;
  }

  estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  getTotalTokenCount(): number {
    let total = 0;

    if (this.systemInstructions) {
      total += this.estimateTokenCount(this.systemInstructions);
    }

    for (const message of this.conversationHistory) {
      total += this.estimateTokenCount(message.content);
    }

    return total;
  }

  private getConversationTokenCount(): number {
    return this.conversationHistory.reduce(
      (total, message) => total + this.estimateTokenCount(message.content),
      0,
    );
  }

  async cleanupContext(): Promise<boolean> {
    if (this.conversationHistory.length === 0) {
      return false;
    }

    const maxTokens = await this.modelInfo.getCurrentModelContextLength();
    const systemTokens = this.systemInstructions
      ? this.estimateTokenCount(this.systemInstructions)
      : 0;
    const availableTokens = maxTokens - systemTokens;

    let conversationTokens = this.getConversationTokenCount();
    if (conversationTokens <= availableTokens) {
      return false;
    }

    const initialMessageCount = this.conversationHistory.length;

    // Find first user message index
    const firstUserMessageIndex = this.conversationHistory.findIndex(
      (msg) => msg.role === "user",
    );

    // Keep track of protected messages (first user message and subsequent message)
    const protectedMessages =
      firstUserMessageIndex >= 0
        ? this.conversationHistory.slice(
            firstUserMessageIndex,
            firstUserMessageIndex + 2,
          )
        : [];
    const protectedTokens = protectedMessages.reduce(
      (total, msg) => total + this.estimateTokenCount(msg.content),
      0,
    );

    // Remove messages from the middle, keeping protected messages
    while (
      conversationTokens - protectedTokens >
        availableTokens - protectedTokens &&
      this.conversationHistory.length > protectedMessages.length
    ) {
      // Start removing from after protected messages
      const indexToRemove = firstUserMessageIndex + 2;
      if (indexToRemove >= this.conversationHistory.length) {
        break;
      }

      const messageToRemove = this.conversationHistory[indexToRemove];
      const messageTokens = this.estimateTokenCount(messageToRemove.content);
      this.conversationHistory.splice(indexToRemove, 1);
      conversationTokens -= messageTokens;
    }

    // Update the log file after cleanup
    this.updateLogFile();

    const removedCount = initialMessageCount - this.conversationHistory.length;
    this.debugLogger.log("Context", "Context cleanup performed", {
      maxTokens,
      systemTokens,
      initialMessageCount,
      remainingMessages: this.conversationHistory.length,
      removedMessages: removedCount,
      protectedMessages: protectedMessages.length,
    });

    await this.modelInfo.logCurrentModelUsage(this.getTotalTokenCount());
    return true;
  }
}
