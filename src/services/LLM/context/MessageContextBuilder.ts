import { MessageContextError } from "@errors/context/MessageContextError";
import { IConversationHistoryMessage } from "@services/LLM/ILLMProvider";
import { autoInjectable, singleton } from "tsyringe";
import { MessageContextExtractor } from "./MessageContextExtractor";
import {
  IMessageContextData,
  MessageCommandOperation,
  MessageFileOperation,
} from "./MessageContextStore";

export type MessageRole = "user" | "assistant" | "system";
export type MessageOperation = MessageFileOperation | MessageCommandOperation;

@singleton()
@autoInjectable()
export class MessageContextBuilder {
  constructor(private extractor: MessageContextExtractor) {}

  private validateContent(content: string): void {
    if (!content || content.trim() === "") {
      throw new MessageContextError("Content cannot be empty");
    }
  }

  private validateRole(role: string): void {
    if (!["user", "assistant", "system"].includes(role)) {
      throw new MessageContextError(`Invalid role: ${role}`);
    }
  }

  private validateContextData(contextData: IMessageContextData): void {
    if (!contextData) {
      throw new MessageContextError("Context data cannot be null or undefined");
    }
    if (!contextData.conversationHistory) {
      throw new MessageContextError(
        "Conversation history cannot be null or undefined",
      );
    }
    if (!contextData.fileOperations) {
      throw new MessageContextError(
        "File operations cannot be null or undefined",
      );
    }
    if (!contextData.commandOperations) {
      throw new MessageContextError(
        "Command operations cannot be null or undefined",
      );
    }
    if (!contextData.phaseInstructions) {
      throw new MessageContextError(
        "Phase instructions cannot be null or undefined",
      );
    }
  }

  public buildMessageContext(
    role: MessageRole,
    content: string,
    currentPhase: string,
    contextData: IMessageContextData,
  ): IMessageContextData {
    try {
      this.validateRole(role);
      this.validateContent(content);
      this.validateContextData(contextData);

      if (!currentPhase) {
        throw new MessageContextError("Current phase cannot be empty");
      }

      const updatedPhaseInstructions = new Map();
      const phasePromptMatches =
        content.match(/<phase_prompt>(.*?)<\/phase_prompt>/gs) || [];

      const isValidPhasePrompt = (prompt: string): boolean => {
        const contentMatch = prompt.match(
          /<phase_prompt>(.*?)<\/phase_prompt>/s,
        );
        if (!contentMatch || !contentMatch[1] || !contentMatch[1].trim())
          return false;
        return true;
      };

      const validPrompts = phasePromptMatches
        .filter(isValidPhasePrompt)
        .map((prompt) => {
          const contentMatch = prompt.match(
            /<phase_prompt>(.*?)<\/phase_prompt>/s,
          );
          return contentMatch?.[1].trim() ?? "";
        })
        .filter((p) => p.length > 0);

      const operations = this.extractor.extractOperations(content);

      if (validPrompts.length > 0) {
        const lastValidPrompt = validPrompts[validPrompts.length - 1];
        updatedPhaseInstructions.set(currentPhase, {
          content: lastValidPrompt,
          timestamp: Date.now(),
          phase: currentPhase,
        });
      }

      if (
        updatedPhaseInstructions.size === 0 &&
        contextData.phaseInstructions.size > 0
      ) {
        const latestInstruction = Array.from(
          contextData.phaseInstructions.values(),
        ).sort((a, b) => b.timestamp - a.timestamp)[0];
        updatedPhaseInstructions.set(
          latestInstruction.phase,
          latestInstruction,
        );
      }

      const updatedFileOperations = new Map(contextData.fileOperations);
      const updatedCommandOperations = new Map(contextData.commandOperations);

      const filteredHistory = contextData.conversationHistory.filter((msg) => {
        const msgContent = msg.content.trim();
        const withoutPhasePrompt = msgContent
          .replace(/<phase_prompt>.*?<\/phase_prompt>/s, "")
          .trim();
        return (
          withoutPhasePrompt.length > 0 ||
          !msgContent.includes("<phase_prompt>")
        );
      });

      const updatedConversationHistory = [...filteredHistory];
      const contentWithoutPhasePrompt = content
        .replace(/<phase_prompt>.*?<\/phase_prompt>/s, "")
        .trim();

      if (
        contentWithoutPhasePrompt.length > 0 ||
        !content.includes("<phase_prompt>")
      ) {
        updatedConversationHistory.push({ role, content });
      }

      operations.forEach(
        (operation: MessageFileOperation | MessageCommandOperation) => {
          if (!operation.timestamp) {
            operation.timestamp = Date.now();
          }

          if (operation.type === "execute_command") {
            const existingOperation = updatedCommandOperations.get(
              operation.command,
            );
            if (!existingOperation || existingOperation.success !== true) {
              updatedCommandOperations.set(operation.command, {
                ...operation,
                ...existingOperation,
              });
            }
          } else {
            const existingOperation = updatedFileOperations.get(operation.path);
            if (!existingOperation || existingOperation.success !== true) {
              updatedFileOperations.set(operation.path, {
                ...operation,
                ...existingOperation,
              });
            }
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
    } catch (error: any) {
      if (error instanceof MessageContextError) {
        throw error;
      }
      throw new MessageContextError(
        `Failed to build message context: ${error.message}`,
      );
    }
  }

  public updateOperationResult(
    type: "read_file" | "write_file" | "execute_command",
    identifier: string,
    result: string,
    contextData: IMessageContextData,
    success?: boolean,
    error?: string,
  ): IMessageContextData {
    try {
      this.validateContextData(contextData);

      if (!identifier) {
        throw new MessageContextError("Operation identifier cannot be empty");
      }

      const updatedFileOperations = new Map(contextData.fileOperations);
      const updatedCommandOperations = new Map(contextData.commandOperations);

      if (type === "execute_command") {
        const existingOperation = updatedCommandOperations.get(identifier);
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
    } catch (error: any) {
      if (error instanceof MessageContextError) {
        throw error;
      }
      throw new MessageContextError(
        `Failed to update operation result: ${error.message}`,
      );
    }
  }

  public getMessageContext(
    contextData: IMessageContextData,
  ): IConversationHistoryMessage[] {
    const phaseInstructions = contextData.phaseInstructions ?? new Map();
    const fileOperations = contextData.fileOperations ?? new Map();
    const commandOperations = contextData.commandOperations ?? new Map();
    const conversationHistory = contextData.conversationHistory ?? [];

    const result: IConversationHistoryMessage[] = [];

    if (contextData.systemInstructions) {
      result.push({
        role: "system" as const,
        content: contextData.systemInstructions,
      });
    }

    const currentPhaseInstructions = Array.from(
      phaseInstructions.values(),
    ).sort((a, b) => b.timestamp - a.timestamp)[0];

    if (currentPhaseInstructions) {
      result.push({
        role: "system" as const,
        content: `<phase_prompt>${currentPhaseInstructions.content}</phase_prompt>`,
      });
    }

    const allOperations: MessageOperation[] = [
      ...Array.from(fileOperations.values()),
      ...Array.from(commandOperations.values()),
    ].sort((a, b) => a.timestamp - b.timestamp);

    for (const operation of allOperations) {
      if ("command" in operation) {
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

        result.push({
          role: "system" as const,
          content,
        });
      } else {
        const status =
          operation.success !== undefined
            ? operation.success
              ? "SUCCESS"
              : "FAILED"
            : "PENDING";
        const errorInfo = operation.error ? ` (Error: ${operation.error})` : "";

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

        result.push({
          role: "system" as const,
          content,
        });
      }
    }

    const filteredMessages = conversationHistory.filter((msg) => {
      const msgContent = msg.content.trim();
      return !(
        msg.content.includes("Content of") ||
        msg.content.includes("Command:") ||
        msg.content.includes("Command executed:") ||
        msg.content.includes("FILE CREATED AND EXISTS:") ||
        msg.content.includes("Written to")
      );
    });

    result.push(...filteredMessages);

    return result;
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
