import { ConfigService } from "@services/ConfigService";
import { IConversationHistoryMessage } from "@services/LLM/ILLMProvider";
import { autoInjectable, singleton } from "tsyringe";
import { PhaseManager } from "../PhaseManager";
import { MessageContextBuilder } from "./MessageContextBuilder";
import { MessageContextLogger } from "./MessageContextLogger";
import { MessageContextStore } from "./MessageContextStore";
import { MessageContextTokenCount } from "./MessageContextTokenCount";

@singleton()
@autoInjectable()
export class MessageContextHistory {
  private abortedMessage: string | null = null;

  constructor(
    private messageContextStore: MessageContextStore,
    private messageContextLogger: MessageContextLogger,
    private phaseManager: PhaseManager,
    private messageContextBuilder: MessageContextBuilder,
    private configService: ConfigService,
    private messageContextTokenCount: MessageContextTokenCount,
  ) {}

  public setAbortedMessage(message: string): void {
    this.abortedMessage = message;
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

    // If there's an aborted message and this is a new user message, combine them
    if (this.abortedMessage && role === "user") {
      content = `${this.abortedMessage} ${content}`;
      this.abortedMessage = null;
    }

    const cleanedContent = this.cleanContent(content);
    if (cleanedContent.trim() === "") {
      return false; // Skip empty messages after cleaning
    }

    // Clean up logs if this is the first message
    if (isFirstMessage && this.isLoggingEnabled()) {
      this.messageContextLogger.cleanupLogFiles();
    }

    // Check for duplicate message using cleaned content
    const contextData = this.messageContextStore.getContextData();
    const isDuplicate = contextData.conversationHistory.some(
      (msg) =>
        msg.role === role && this.cleanContent(msg.content) === cleanedContent,
    );

    if (isDuplicate) {
      return false; // Skip duplicate messages
    }

    const updatedData = this.messageContextBuilder.buildMessageContext(
      role as "user" | "assistant" | "system",
      content,
      this.phaseManager.getCurrentPhase(),
      contextData,
    );
    this.messageContextStore.setContextData(updatedData);

    this.messageContextTokenCount.logContextUsage();

    return true;
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

  private cleanContent(content: string): string {
    // Remove phase prompts
    content = content
      ?.replace(/<phase_prompt>.*?<\/phase_prompt>/gs, "")
      .trim();

    // Remove file operation messages
    if (
      content?.includes("Content of") ||
      content?.includes("Written to") ||
      content?.includes("FILE CREATED AND EXISTS:") ||
      content?.includes("Command executed:") ||
      content?.includes("Command:")
    ) {
      return "";
    }

    return content;
  }

  private isLoggingEnabled(): boolean {
    const config = this.configService.getConfig();
    return config.enableConversationLog === true;
  }
}
