import { ConfigService } from "@services/ConfigService";
import { IConversationHistoryMessage } from "@services/LLM/ILLMProvider";
import { ModelInfo } from "@services/LLM/ModelInfo";
import { DebugLogger } from "@services/logging/DebugLogger";
import * as path from "path";
import { autoInjectable, singleton } from "tsyringe";
import { MessageConversationLogger } from "./MessageConversationLogger";

interface FileOperation {
  type: "read_file" | "write_file" | "execute_command";
  path?: string;
  command?: string;
}

interface ActionResult {
  success: boolean;
  error?: Error;
  result?: string;
}

@singleton()
@autoInjectable()
export class MessageContextManager {
  private conversationHistory: IConversationHistoryMessage[] = [];
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
    private configService: ConfigService,
    private conversationLogger: MessageConversationLogger,
  ) {
    // Clean up log file on startup, but not in test environment
    if (process.env.NODE_ENV !== "test") {
      this.cleanupLogFile();
    }
  }

  private cleanupLogFile(): void {
    if (!this.isLoggingEnabled()) return;
    this.conversationLogger.cleanupLogFiles();
  }

  private isLoggingEnabled(): boolean {
    const config = this.configService.getConfig();
    return !!config.enableConversationLog;
  }

  private logMessage(message: IConversationHistoryMessage): void {
    // Skip logging in test environment or if disabled
    if (process.env.NODE_ENV === "test" || !this.isLoggingEnabled()) return;
    this.conversationLogger.logMessage(message);
  }

  private logActionResult(action: string, result: ActionResult): void {
    // Skip logging in test environment or if disabled
    if (process.env.NODE_ENV === "test" || !this.isLoggingEnabled()) return;
    this.conversationLogger.logActionResult(action, result);
  }

  private updateLogFile(): void {
    // Skip logging in test environment or if disabled
    if (process.env.NODE_ENV === "test" || !this.isLoggingEnabled()) return;
    this.conversationLogger.updateConversationHistory(
      this.conversationHistory,
      this.systemInstructions,
    );
  }

  private extractOperations(content: string): FileOperation[] {
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

    // Extract execute_command operations
    const commandMatches = Array.from(
      content.matchAll(/<execute_command>[\s\S]*?<command>(.*?)<\/command>/g),
    );
    commandMatches.forEach((match) => {
      if (match[1]) {
        operations.push({
          type: "execute_command",
          command: match[1],
        });
      }
    });

    return operations;
  }

  private hasPhasePrompt(content: string): boolean {
    return content.includes("<phase_prompt>");
  }

  private removeOldOperations(newMessage: IConversationHistoryMessage): void {
    this.debugLogger.log("Context", "Removing old operations");

    const newOperations = this.extractOperations(newMessage.content);
    const hasNewPhasePrompt = this.hasPhasePrompt(newMessage.content);

    this.conversationHistory = this.conversationHistory.filter((msg) => {
      // If new message has a phase prompt, remove old phase prompts
      if (hasNewPhasePrompt && this.hasPhasePrompt(msg.content)) {
        return false;
      }

      // Keep messages without operations
      if (
        !msg.content.includes("<read_file>") &&
        !msg.content.includes("<write_file>") &&
        !msg.content.includes("<execute_command>")
      ) {
        return true;
      }

      const msgOperations = this.extractOperations(msg.content);

      // Remove message if it has any matching operations
      return !msgOperations.some((msgOp) =>
        newOperations.some((newOp) => {
          if (
            newOp.type === "execute_command" &&
            msgOp.type === "execute_command"
          ) {
            return newOp.command === msgOp.command;
          }
          return newOp.type === msgOp.type && newOp.path === msgOp.path;
        }),
      );
    });

    // Update the log file with current conversation history
    this.updateLogFile();
  }

  cleanupPhaseContent(): void {
    this.debugLogger.log("Context", "Cleaning up phase content");

    // Remove all content within phase-related tags from previous messages
    this.conversationHistory = this.conversationHistory.map((msg) => {
      let content = msg.content;
      // Remove phase_prompt content
      content = content.replace(/<phase_prompt>[\s\S]*?<\/phase_prompt>/g, "");
      return {
        ...msg,
        content: content,
      };
    });

    // Update the log file with cleaned conversation history
    this.updateLogFile();
  }

  mergeConversationHistory(): void {
    this.debugLogger.log("Context", "Merging conversation history");

    if (this.conversationHistory.length === 0) {
      return;
    }

    const mergedContent = this.conversationHistory
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n\n");

    this.conversationHistory = [
      {
        role: "assistant",
        content: mergedContent,
      },
    ];

    // Update the log file with merged conversation history
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

    // Remove old operations before adding new message
    if (role === "user" || role === "assistant") {
      this.removeOldOperations(message);
    }

    this.conversationHistory.push(message);
    this.logMessage(message);

    return true;
  }

  logAction(action: string, result: ActionResult): void {
    this.logActionResult(action, result);
  }

  getMessages(): IConversationHistoryMessage[] {
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

    const conversationTokens = this.getConversationTokenCount();
    if (conversationTokens <= availableTokens) {
      return false;
    }

    const initialMessageCount = this.conversationHistory.length;

    // Split messages into phase prompts and regular messages
    const phasePrompts: IConversationHistoryMessage[] = [];
    const regularMessages: IConversationHistoryMessage[] = [];

    this.conversationHistory.forEach((msg) => {
      if (this.hasPhasePrompt(msg.content)) {
        phasePrompts.push(msg);
      } else {
        regularMessages.push(msg);
      }
    });

    // Calculate tokens for phase prompts
    const phasePromptTokens = phasePrompts.reduce(
      (total, msg) => total + this.estimateTokenCount(msg.content),
      0,
    );

    // Available tokens for regular messages
    const availableRegularTokens = availableTokens - phasePromptTokens;
    let currentTokens = 0;

    // Keep messages from the beginning until we hit the token limit
    const keptMessages: IConversationHistoryMessage[] = [];
    for (const msg of regularMessages) {
      const msgTokens = this.estimateTokenCount(msg.content);
      if (currentTokens + msgTokens <= availableRegularTokens) {
        keptMessages.push(msg);
        currentTokens += msgTokens;
      } else {
        break;
      }
    }

    // Combine phase prompts and kept messages in chronological order
    const allMessages = [...phasePrompts, ...keptMessages].sort((a, b) => {
      const aIndex = this.conversationHistory.indexOf(a);
      const bIndex = this.conversationHistory.indexOf(b);
      return aIndex - bIndex;
    });

    this.conversationHistory = allMessages;

    // Update the log file after cleanup
    this.updateLogFile();

    const removedCount = initialMessageCount - this.conversationHistory.length;
    this.debugLogger.log("Context", "Context cleanup performed", {
      maxTokens,
      systemTokens,
      initialMessageCount,
      remainingMessages: this.conversationHistory.length,
      removedMessages: removedCount,
    });

    await this.modelInfo.logCurrentModelUsage(this.getTotalTokenCount());
    return true;
  }
}
