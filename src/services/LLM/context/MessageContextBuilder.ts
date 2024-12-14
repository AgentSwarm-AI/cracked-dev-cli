import { IConversationHistoryMessage } from "@services/LLM/ILLMProvider";
import { autoInjectable, singleton } from "tsyringe";
import { MessageContextExtractor } from "./MessageContextExtractor";
import {
  IMessageContextData,
  MessageCommandOperation,
  MessageFileOperation,
} from "./MessageContextStore";

type MessageRole = "user" | "assistant" | "system";
type MessageOperation = MessageFileOperation | MessageCommandOperation;

@singleton()
@autoInjectable()
export class MessageContextBuilder {
  constructor(private extractor: MessageContextExtractor) {}

  public buildMessageContext(
    role: MessageRole,
    content: string,
    currentPhase: string,
    contextData: IMessageContextData,
  ): IMessageContextData {
    if (content.trim() === "") {
      throw new Error("Content cannot be empty");
    }

    const message: IConversationHistoryMessage = { role, content };
    const phasePrompt = this.extractor.extractPhasePrompt(message.content);
    const operations = this.extractor.extractOperations(message.content);
    const updatedPhaseInstructions = new Map(contextData.phaseInstructions);
    const updatedFileOperations = new Map(contextData.fileOperations);
    const updatedCommandOperations = new Map(contextData.commandOperations);
    const updatedConversationHistory = [...contextData.conversationHistory];

    if (phasePrompt) {
      // Only store phase prompt for current phase
      updatedPhaseInstructions.clear(); // Clear old phase prompts
      updatedPhaseInstructions.set(currentPhase, {
        content: phasePrompt,
        timestamp: Date.now(),
        phase: currentPhase,
      });
    }

    updatedConversationHistory.push(message);

    operations.forEach(
      (operation: MessageFileOperation | MessageCommandOperation) => {
        if (operation.type === "execute_command") {
          const existingOperation = updatedCommandOperations.get(
            operation.command,
          );
          updatedCommandOperations.set(operation.command, {
            ...existingOperation,
            ...operation,
          });
        } else {
          const existingOperation = updatedFileOperations.get(operation.path);
          updatedFileOperations.set(operation.path, {
            ...existingOperation,
            ...operation,
          });
        }
      },
    );

    return {
      ...contextData,
      phaseInstructions: updatedPhaseInstructions,
      conversationHistory: updatedConversationHistory,
      fileOperations: updatedFileOperations,
      commandOperations: updatedCommandOperations,
    };
  }

  public updateOperationResult(
    type: "read_file" | "write_file" | "execute_command",
    identifier: string,
    result: string,
    contextData: IMessageContextData,
    success?: boolean,
    error?: string,
  ): IMessageContextData {
    const updatedFileOperations = new Map(contextData.fileOperations);
    const updatedCommandOperations = new Map(contextData.commandOperations);

    if (type === "execute_command") {
      const existingOperation = updatedCommandOperations.get(identifier);
      // Only update the operation if it doesn't exist or wasn't a success
      if (existingOperation && existingOperation.success === true) {
        return contextData;
      }

      const operation = existingOperation || {
        type: "execute_command",
        command: identifier,
        timestamp: Date.now(),
      };

      updatedCommandOperations.set(identifier, {
        ...operation,
        output: result,
        success,
        error,
      });
    } else {
      const existingOperation = updatedFileOperations.get(identifier);

      // Only update the operation if it doesn't exist or wasn't a success
      if (existingOperation && existingOperation.success === true) {
        return contextData;
      }

      const operation = existingOperation || {
        type,
        path: identifier,
        timestamp: Date.now(),
      };

      updatedFileOperations.set(identifier, {
        ...operation,
        content: result,
        success,
        error,
      });
    }

    return {
      ...contextData,
      fileOperations: updatedFileOperations,
      commandOperations: updatedCommandOperations,
      phaseInstructions: new Map(contextData.phaseInstructions),
      conversationHistory: [...contextData.conversationHistory],
    };
  }

  public getMessageContext(
    contextData: IMessageContextData,
  ): IConversationHistoryMessage[] {
    const baseContext = contextData.systemInstructions
      ? [{ role: "system" as const, content: contextData.systemInstructions }]
      : [];

    const operationsContext: IConversationHistoryMessage[] = [];

    // Add current phase instructions only
    const currentPhaseInstructions = Array.from(
      contextData.phaseInstructions.values(),
    ).sort((a, b) => b.timestamp - a.timestamp)[0];

    if (currentPhaseInstructions) {
      operationsContext.push({
        role: "system",
        content: `<phase_prompt>${currentPhaseInstructions.content}</phase_prompt>`,
      });
    }

    // Sort operations by timestamp
    const allOperations: MessageOperation[] = [
      ...Array.from(contextData.fileOperations.values()),
      ...Array.from(contextData.commandOperations.values()),
    ].sort((a, b) => a.timestamp - b.timestamp);

    // Add operations in chronological order
    for (const operation of allOperations) {
      if ("command" in operation) {
        // Handle command operations
        const status =
          operation.success !== undefined
            ? operation.success
              ? "SUCCESS"
              : "FAILED"
            : "PENDING";
        const errorInfo = operation.error ? ` (Error: ${operation.error})` : "";
        const content = operation.output
          ? `Command: ${operation.command} [${status}${errorInfo}]\nOutput:\n${operation.output}`
          : `Command executed: ${operation.command} [${status}${errorInfo}]`;

        operationsContext.push({
          role: "system",
          content,
        });
      } else {
        // Handle file operations
        const status =
          operation.success !== undefined
            ? operation.success
              ? "SUCCESS"
              : "FAILED"
            : "PENDING";
        const errorInfo = operation.error ? ` (Error: ${operation.error})` : "";

        // Make successful write operations more prominent with file path
        const content =
          operation.type === "write_file" && operation.success
            ? `FILE CREATED AND EXISTS: ${operation.path} [${status}${errorInfo}]${
                operation.content ? `\nContent:\n${operation.content}` : ""
              }`
            : `${operation.type === "read_file" ? "Content of" : "Written to"} ${
                operation.path
              } [${status}${errorInfo}]${
                operation.content ? `\nContent:\n${operation.content}` : ""
              }`;

        operationsContext.push({
          role: "system",
          content,
        });
      }
    }

    return [
      ...baseContext,
      ...operationsContext,
      ...contextData.conversationHistory,
    ];
  }

  public getLatestPhaseInstructions(
    contextData: IMessageContextData,
  ): string | null {
    const instructions = Array.from(
      contextData.phaseInstructions.values(),
    ).sort((a, b) => b.timestamp - a.timestamp)[0];
    return instructions?.content ?? null;
  }

  public getFileOperation(
    path: string,
    contextData: IMessageContextData,
  ): MessageFileOperation | undefined {
    return contextData.fileOperations.get(path);
  }

  public getCommandOperation(
    command: string,
    contextData: IMessageContextData,
  ): MessageCommandOperation | undefined {
    return contextData.commandOperations.get(command);
  }
}
