import { IConversationHistoryMessage } from "@services/LLM/ILLMProvider";
import { autoInjectable, singleton } from "tsyringe";
import { PhaseManager } from "../PhaseManager";
import { MessageContextBuilder } from "./MessageContextBuilder";
import {
  MessageContextLogger,
  MessageIActionResult,
} from "./MessageContextLogger";
import { MessageContextStore } from "./MessageContextStore";

@singleton()
@autoInjectable()
export class MessageContextHistory {
  constructor(
    private messageContextStore: MessageContextStore,
    private messageContextLogger: MessageContextLogger,
    private phaseManager: PhaseManager,
    private messageContextBuilder: MessageContextBuilder,
  ) {}

  private cleanContent(content: string): string {
    // Remove phase prompts
    content = content.replace(/<phase_prompt>.*?<\/phase_prompt>/gs, "").trim();

    // Remove file operation messages
    if (
      content.includes("Content of") ||
      content.includes("Written to") ||
      content.includes("FILE CREATED AND EXISTS:") ||
      content.includes("Command executed:") ||
      content.includes("Command:")
    ) {
      return "";
    }

    return content;
  }

  public mergeConversationHistory(): void {
    const history =
      this.messageContextStore.getContextData().conversationHistory;
    if (history.length === 0) return;

    const cleanedHistory = history
      .map((msg) => ({
        role: msg.role,
        content: this.cleanContent(msg.content),
      }))
      .filter((msg) => msg.content !== ""); // Remove empty messages

    if (cleanedHistory.length === 0) return;

    const mergedContent = cleanedHistory
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n\n");

    this.addMessage("assistant", mergedContent, false);
    this.messageContextStore.setContextData({
      conversationHistory: [],
      phaseInstructions: new Map(),
    });
  }

  public addMessage(
    role: string,
    content: string,
    log = true,
    isFirstMessage = false,
  ): boolean {
    if (!["user", "assistant", "system"].includes(role)) {
      throw new Error(`Invalid role: ${role}`);
    }

    if (content.trim() === "") {
      throw new Error("Content cannot be empty");
    }

    // Clean up logs if this is the first message
    if (isFirstMessage && this.isLoggingEnabled()) {
      this.messageContextLogger.cleanupLogFiles();
    }

    const updatedData = this.messageContextBuilder.buildMessageContext(
      role as "user" | "assistant" | "system",
      content,
      this.phaseManager.getCurrentPhase(),
      this.messageContextStore.getContextData(),
    );
    this.messageContextStore.setContextData(updatedData);

    if (log) {
      this.logMessage({
        role: role as "user" | "assistant" | "system",
        content,
      });
    }

    return true;
  }

  private logMessage(message: IConversationHistoryMessage): void {
    if (process.env.NODE_ENV === "test" || !this.isLoggingEnabled()) return;
    this.messageContextLogger.logMessage(message);
  }

  private isLoggingEnabled(): boolean {
    return this.messageContextLogger.getConversationLogPath() !== null;
  }

  public logActionResult(action: string, result: MessageIActionResult): void {
    if (process.env.NODE_ENV === "test" || !this.isLoggingEnabled()) return;
    this.messageContextLogger.logActionResult(action, result);
  }

  public updateMessageContextWithOperationResult(
    action: string,
    result: string,
    success?: boolean,
    error?: string,
  ): void {
    let updatedData = this.messageContextStore.getContextData();

    if (action.startsWith("read_file:")) {
      const path = action.replace("read_file:", "").trim();
      updatedData = this.messageContextBuilder.updateOperationResult(
        "read_file",
        path,
        result,
        updatedData,
        success,
        error,
      );
    } else if (action.startsWith("write_file:")) {
      const path = action.replace("write_file:", "").trim();
      updatedData = this.messageContextBuilder.updateOperationResult(
        "write_file",
        path,
        result,
        updatedData,
        success,
        error,
      );
    } else if (action.startsWith("execute_command:")) {
      const command = action.replace("execute_command:", "").trim();
      updatedData = this.messageContextBuilder.updateOperationResult(
        "execute_command",
        command,
        result,
        updatedData,
        success,
        error,
      );
    }

    this.messageContextStore.setContextData(updatedData);
  }

  public getMessages(): IConversationHistoryMessage[] {
    return this.messageContextBuilder.getMessageContext(
      this.messageContextStore.getContextData(),
    );
  }

  public clear(): void {
    this.messageContextStore.clear();
    this.messageContextLogger.cleanupLogFiles();
  }

  public setSystemInstructions(instructions: string): void {
    this.messageContextStore.setContextData({
      systemInstructions: instructions,
    });
  }

  public getSystemInstructions(): string | null {
    return this.messageContextStore.getContextData().systemInstructions;
  }

  public updateLogFile(): void {
    if (process.env.NODE_ENV === "test" || !this.isLoggingEnabled()) return;
    this.messageContextLogger.updateConversationHistory(
      this.messageContextBuilder.getMessageContext(
        this.messageContextStore.getContextData(),
      ),
      this.messageContextStore.getContextData().systemInstructions,
    );
  }
}
