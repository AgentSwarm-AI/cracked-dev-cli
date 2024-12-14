import { IConversationHistoryMessage } from "@services/LLM/ILLMProvider";
import { singleton } from "tsyringe";

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

  public getContextData(): IMessageContextData {
    return this.contextData;
  }

  public setContextData(data: Partial<IMessageContextData>): void {
    this.contextData = {
      phaseInstructions:
        data.phaseInstructions !== undefined
          ? new Map([...(data.phaseInstructions || [])])
          : this.contextData.phaseInstructions,
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

  public estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  public getTotalTokenCount(): number {
    let total = 0;
    if (this.contextData.systemInstructions) {
      total += this.estimateTokenCount(this.contextData.systemInstructions);
    }
    this.contextData.conversationHistory.forEach((message) => {
      total += this.estimateTokenCount(message.content);
    });
    return total;
  }
}
