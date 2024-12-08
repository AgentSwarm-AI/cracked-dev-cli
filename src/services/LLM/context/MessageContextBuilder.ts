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

    // Track paths and commands that appear in the new message
    const newFilePaths = new Set<string>();
    const newCommands = new Set<string>();

    newOperations.forEach((operation) => {
      if (operation.type === "execute_command") {
        newCommands.add(operation.command);
      } else {
        newFilePaths.add(operation.path);
      }
    });

    // Remove old operations for files that appear in the new message
    for (const [path] of this.fileOperations) {
      if (newFilePaths.has(path)) {
        this.fileOperations.delete(path);
      }
    }

    // Remove old operations for commands that appear in the new message
    for (const [command] of this.commandOperations) {
      if (newCommands.has(command)) {
        this.commandOperations.delete(command);
      }
    }

    // Remove any conversation history entries that contain the old operations
    this.conversationHistory = this.conversationHistory.filter((msg) => {
      // Keep user messages
      if (msg.role === "user") return true;

      // Remove assistant messages that contain any of the new operations
      if (msg.role === "assistant") {
        return (
          ![...newFilePaths].some((path) => msg.content.includes(path)) &&
          ![...newCommands].some((cmd) => msg.content.includes(cmd))
        );
      }

      // Remove system messages that contain any of the new operations
      return (
        ![...newFilePaths].some((path) => msg.content.includes(path)) &&
        ![...newCommands].some((cmd) => msg.content.includes(cmd))
      );
    });
  }

  // Add this method to extract non-operation content
  private extractNonOperationContent(content: string): string {
    return content
      .replace(/<read_file>[\s\S]*?<\/read_file>/g, "")
      .replace(/<write_file>[\s\S]*?<\/write_file>/g, "")
      .replace(/<execute_command>[\s\S]*?<\/execute_command>/g, "")
      .replace(/<phase_prompt>[\s\S]*?<\/phase_prompt>/g, "")
      .trim();
  }

  // Update the addMessage method
  addMessage(role: MessageRole, content: string): void {
    if (content.trim() === "") {
      throw new Error("Content cannot be empty");
    }

    const message: IConversationHistoryMessage = { role, content };

    if (role === "user" || role === "assistant") {
      this.removeOldOperations(message);
      this.processMessage(message);
    }

    if (role === "user") {
      this.conversationHistory.push(message);
    } else if (role === "assistant") {
      const operations = this.extractOperations(content);
      if (operations.length === 0) {
        this.conversationHistory.push(message);
      } else {
        const nonOpContent = this.extractNonOperationContent(content);
        if (nonOpContent) {
          const nonOpMessage: IConversationHistoryMessage = {
            role,
            content: nonOpContent,
          };
          this.conversationHistory.push(nonOpMessage);
        }
      }
    } else {
      // Handle system messages
      if (!this.extractOperations(content).length) {
        this.conversationHistory.push(message);
      }
    }
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
