import { ConfigService } from "@services/ConfigService";
import { IConversationHistoryMessage } from "@services/LLM/ILLMProvider";
import { ModelInfo } from "@services/LLM/ModelInfo";
import { DebugLogger } from "@services/logging/DebugLogger";
import * as path from "path";
import { autoInjectable, singleton } from "tsyringe";
import { MessageContextBuilder } from "./MessageContextBuilder";
import { MessageContextCleanup } from "./MessageContextCleanup";
import { MessageConversationLogger } from "./MessageConversationLogger";

interface ActionResult {
  success: boolean;
  error?: Error;
  result?: string;
}

@singleton()
@autoInjectable()
export class MessageContextManager {
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
    private contextBuilder: MessageContextBuilder,
    private contextCleanup: MessageContextCleanup,
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
      this.contextBuilder.getConversationHistory(),
      this.contextBuilder.getSystemInstructions(),
    );
  }

  cleanupPhaseContent(): void {
    this.debugLogger.log("Context", "Cleaning up phase content");
    this.contextBuilder.clear();
    this.updateLogFile();
  }

  mergeConversationHistory(): void {
    this.debugLogger.log("Context", "Merging conversation history");

    const history = this.contextBuilder.getConversationHistory();
    if (history.length === 0) {
      return;
    }

    const mergedContent = history
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n\n");

    this.contextBuilder.clear();
    this.contextBuilder.addMessage("assistant", mergedContent);

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
    this.contextBuilder.addMessage(role, content);
    this.logMessage(message);

    return true;
  }

  logAction(action: string, result: ActionResult): void {
    // Update context builder with operation result
    if (action.startsWith("read_file:")) {
      const path = action.replace("read_file:", "").trim();
      this.contextBuilder.updateOperationResult(
        "read_file",
        path,
        result.result || "",
      );
    } else if (action.startsWith("write_file:")) {
      const path = action.replace("write_file:", "").trim();
      this.contextBuilder.updateOperationResult(
        "write_file",
        path,
        result.result || "",
      );
    } else if (action.startsWith("execute_command:")) {
      const command = action.replace("execute_command:", "").trim();
      this.contextBuilder.updateOperationResult(
        "execute_command",
        command,
        result.result || "",
      );
    }

    this.logActionResult(action, result);
  }

  getMessages(): IConversationHistoryMessage[] {
    return this.contextBuilder.getConversationHistory();
  }

  clear(): void {
    const hadMessages = this.getMessages().length > 0;
    const hadInstructions =
      this.contextBuilder.getSystemInstructions() !== null;

    this.contextBuilder.clear();

    // Update the log file when clearing context
    this.updateLogFile();

    this.debugLogger.log("Context", "Context cleared", {
      clearedMessages: hadMessages,
      clearedInstructions: hadInstructions,
    });
  }

  setSystemInstructions(instructions: string): void {
    const hadPreviousInstructions =
      this.contextBuilder.getSystemInstructions() !== null;
    this.contextBuilder.setSystemInstructions(instructions);

    // Update the log file when system instructions change
    this.updateLogFile();

    this.debugLogger.log("Context", "System instructions updated", {
      hadPreviousInstructions,
      instructionsLength: instructions.length,
    });
  }

  getSystemInstructions(): string | null {
    return this.contextBuilder.getSystemInstructions();
  }

  getCurrentModel(): string | null {
    return this.currentModel;
  }

  estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  getTotalTokenCount(): number {
    const history = this.contextBuilder.getConversationHistory();
    const systemInstructions = this.contextBuilder.getSystemInstructions();
    let total = 0;

    if (systemInstructions) {
      total += this.estimateTokenCount(systemInstructions);
    }

    return history.reduce(
      (sum, message) => sum + this.estimateTokenCount(message.content),
      total,
    );
  }

  async cleanupContext(): Promise<boolean> {
    const maxTokens = await this.modelInfo.getCurrentModelContextLength();
    const cleaned = await this.contextCleanup.cleanupContext(
      maxTokens,
      this.estimateTokenCount.bind(this),
    );

    if (cleaned) {
      // Update the log file after cleanup
      this.updateLogFile();

      const history = this.getMessages();
      this.debugLogger.log("Context", "Context cleanup performed", {
        maxTokens,
        remainingMessages: history.length,
      });

      await this.modelInfo.logCurrentModelUsage(this.getTotalTokenCount());
    }

    return cleaned;
  }
}
