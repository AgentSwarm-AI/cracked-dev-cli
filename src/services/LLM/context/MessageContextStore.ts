import { IConversationHistoryMessage } from "@services/LLM/ILLMProvider";
import { delay, inject, singleton } from "tsyringe";
import { MessageContextTokenCount } from "./MessageContextTokenCount";

export interface BaseOperation {
  timestamp: number;
  success?: boolean;
  error?: string;
}

export interface MessageFileOperation extends BaseOperation {
  type: "read_file" | "write_file";
  path: string;
  content?: string;
}

export interface MessageCommandOperation extends BaseOperation {
  type: "execute_command";
  command: string;
  output?: string;
}

export interface MessagePhaseInstruction {
  phase: string;
  content: string;
  timestamp: number;
}

export interface IMessageContextData {
  phaseInstructions: Map<string, MessagePhaseInstruction>;
  fileOperations: Map<string, MessageFileOperation>;
  commandOperations: Map<string, MessageCommandOperation>;
  conversationHistory: IConversationHistoryMessage[];
  systemInstructions: string | null;
}

@singleton()
export class MessageContextStore {
  private contextData: IMessageContextData = {
    phaseInstructions: new Map(),
    fileOperations: new Map(),
    commandOperations: new Map(),
    conversationHistory: [],
    systemInstructions: null,
  };

  constructor(
    @inject(delay(() => MessageContextTokenCount))
    private messageContextTokenCount: MessageContextTokenCount,
  ) {}

  public getContextData(): IMessageContextData {
    return this.contextData;
  }

  public setContextData(data: Partial<IMessageContextData>): void {
    // If new phase instructions are provided, only keep the latest one
    let newPhaseInstructions = this.contextData.phaseInstructions;
    if (data.phaseInstructions !== undefined) {
      const instructions = Array.from(data.phaseInstructions.values()).sort(
        (a, b) => b.timestamp - a.timestamp,
      );
      newPhaseInstructions = new Map();
      if (instructions.length > 0) {
        newPhaseInstructions.set(instructions[0].phase, instructions[0]);
      }
    }

    this.contextData = {
      phaseInstructions: newPhaseInstructions,
      fileOperations:
        data.fileOperations !== undefined
          ? new Map([...(data.fileOperations || [])])
          : this.contextData.fileOperations,
      commandOperations:
        data.commandOperations !== undefined
          ? new Map([...(data.commandOperations || [])])
          : this.contextData.commandOperations,
      conversationHistory:
        data.conversationHistory !== undefined
          ? data.conversationHistory
          : this.contextData.conversationHistory,
      systemInstructions:
        data.systemInstructions !== undefined
          ? data.systemInstructions
          : this.contextData.systemInstructions,
    };
  }

  public clear(): void {
    this.contextData = {
      phaseInstructions: new Map(),
      fileOperations: new Map(),
      commandOperations: new Map(),
      conversationHistory: [],
      systemInstructions: null,
    };
  }

  public getTotalTokenCount(): number {
    return this.messageContextTokenCount.getTotalTokenCount();
  }
}
