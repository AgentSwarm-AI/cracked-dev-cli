import { IConversationHistoryMessage } from "@services/LLM/ILLMProvider";
import { autoInjectable, singleton } from "tsyringe";

interface FileOperation {
  type: "read_file" | "write_file";
  path: string;
  content?: string;
}

interface CommandOperation {
  type: "execute_command";
  command: string;
  output?: string;
}

interface PhaseInstruction {
  content: string;
  timestamp: number;
}

type Operation = FileOperation | CommandOperation;
type MessageRole = "user" | "assistant" | "system";

@singleton()
@autoInjectable()
export class MessageContextBuilder {
  private phaseInstructions: PhaseInstruction | null = null;
  private fileOperations: Map<string, FileOperation> = new Map();
  private commandOperations: Map<string, CommandOperation> = new Map();
  private conversationHistory: IConversationHistoryMessage[] = [];
  private systemInstructions: string | null = null;

  private extractPhasePrompt(content: string): string | null {
    const match = content.match(/<phase_prompt>([\s\S]*?)<\/phase_prompt>/);
    return match ? match[1].trim() : null;
  }

  private extractOperations(content: string): Operation[] {
    const operations: Operation[] = [];

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
    const newOperations = this.extractOperations(newMessage.content);
    const hasNewPhasePrompt = this.hasPhasePrompt(newMessage.content);

    // If the new message has read_file operations, we'll keep only this message
    const hasNewReadFileOps = newOperations.some(
      (op) => op.type === "read_file",
    );

    this.conversationHistory = this.conversationHistory.filter((msg) => {
      // If new message has a phase prompt, remove old phase prompts
      if (hasNewPhasePrompt && this.hasPhasePrompt(msg.content)) {
        return false;
      }

      const msgOperations = this.extractOperations(msg.content);
      const hasReadFileOps = msgOperations.some(
        (op) => op.type === "read_file",
      );

      // If new message has read_file operations, remove old messages with read_file
      if (hasNewReadFileOps && hasReadFileOps) {
        return false;
      }

      // Keep messages without write_file or execute_command operations
      if (
        !msg.content.includes("<write_file>") &&
        !msg.content.includes("<execute_command>")
      ) {
        return true;
      }

      // Remove message if it has any matching write_file or execute_command operations
      return !msgOperations.some((msgOp) =>
        newOperations.some((newOp) => {
          if (
            newOp.type === "execute_command" &&
            msgOp.type === "execute_command"
          ) {
            return newOp.command === msgOp.command;
          }
          if (newOp.type === "write_file" && msgOp.type === "write_file") {
            return newOp.path === msgOp.path;
          }
          return false;
        }),
      );
    });
  }

  addMessage(role: MessageRole, content: string): void {
    if (content.trim() === "") {
      throw new Error("Content cannot be empty");
    }

    const message: IConversationHistoryMessage = { role, content };

    if (role === "user" || role === "assistant") {
      this.removeOldOperations(message);
      this.processMessage(message);
    }

    this.conversationHistory.push(message);
  }

  processMessage(message: IConversationHistoryMessage): void {
    // Process phase instructions
    const phasePrompt = this.extractPhasePrompt(message.content);
    if (phasePrompt) {
      this.phaseInstructions = {
        content: phasePrompt,
        timestamp: Date.now(),
      };
    }

    // Process operations
    const operations = this.extractOperations(message.content);
    operations.forEach((operation) => {
      if (operation.type === "execute_command") {
        this.commandOperations.set(operation.command, operation);
      } else {
        this.fileOperations.set(operation.path, operation);
      }
    });
  }

  updateOperationResult(
    type: "read_file" | "write_file" | "execute_command",
    identifier: string,
    result: string,
  ): void {
    if (type === "execute_command") {
      const operation = this.commandOperations.get(identifier);
      if (operation && operation.type === "execute_command") {
        operation.output = result;
      }
    } else {
      const operation = this.fileOperations.get(identifier);
      if (
        operation &&
        (operation.type === "read_file" || operation.type === "write_file")
      ) {
        operation.content = result;
      }
    }
  }

  setSystemInstructions(instructions: string | null): void {
    this.systemInstructions = instructions;
  }

  getSystemInstructions(): string | null {
    return this.systemInstructions;
  }

  getConversationHistory(): IConversationHistoryMessage[] {
    const baseContext = this.systemInstructions
      ? [{ role: "system" as const, content: this.systemInstructions }]
      : [];

    // Build context from operations
    const operationsContext: IConversationHistoryMessage[] = [];

    // Add phase instructions if present
    if (this.phaseInstructions) {
      operationsContext.push({
        role: "system",
        content: `<phase_prompt>${this.phaseInstructions.content}</phase_prompt>`,
      });
    }

    // Add file operations
    for (const operation of this.fileOperations.values()) {
      const content = operation.content
        ? `${operation.type === "read_file" ? "Content of" : "Written to"} ${
            operation.path
          }:\n${operation.content}`
        : `${operation.type} operation on ${operation.path}`;

      operationsContext.push({
        role: "system",
        content,
      });
    }

    // Add command operations
    for (const operation of this.commandOperations.values()) {
      const content = operation.output
        ? `Command: ${operation.command}\nOutput:\n${operation.output}`
        : `Command executed: ${operation.command}`;

      operationsContext.push({
        role: "system",
        content,
      });
    }

    return [...baseContext, ...operationsContext, ...this.conversationHistory];
  }

  clear(): void {
    this.phaseInstructions = null;
    this.fileOperations.clear();
    this.commandOperations.clear();
    this.conversationHistory = [];
    this.systemInstructions = null;
  }

  getLatestPhaseInstructions(): string | null {
    return this.phaseInstructions?.content ?? null;
  }

  getFileOperation(path: string): FileOperation | undefined {
    return this.fileOperations.get(path);
  }

  getCommandOperation(command: string): CommandOperation | undefined {
    return this.commandOperations.get(command);
  }
}
