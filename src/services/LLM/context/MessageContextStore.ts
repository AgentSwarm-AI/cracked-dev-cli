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
    this.contextData = {
      phaseInstructions: this.getUpdatedPhaseInstructions(data),
      fileOperations: this.getUpdatedOperations(
        data.fileOperations,
        this.contextData.fileOperations,
      ),
      commandOperations: this.getUpdatedOperations(
        data.commandOperations,
        this.contextData.commandOperations,
      ),
      conversationHistory: this.deduplicateMessages(
        this.getUpdatedValue(
          data.conversationHistory,
          this.contextData.conversationHistory,
        ),
      ),
      systemInstructions: this.getUpdatedValue(
        data.systemInstructions,
        this.contextData.systemInstructions,
      ),
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

  private getUpdatedPhaseInstructions(
    data: Partial<IMessageContextData>,
  ): Map<string, any> {
    if (data.phaseInstructions === undefined) {
      return this.contextData.phaseInstructions;
    }

    const instructions = Array.from(data.phaseInstructions.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 1); // Keep only the latest instruction

    return new Map(instructions.map((i) => [i.phase, i]));
  }

  private getUpdatedOperations<T>(
    newOperations: Map<string, T> | undefined,
    existingOperations: Map<string, T>,
  ): Map<string, T> {
    if (newOperations === undefined) {
      return existingOperations;
    }
    return new Map([...newOperations]);
  }

  private getUpdatedValue<T>(newValue: T | undefined, existingValue: T): T {
    return newValue !== undefined ? newValue : existingValue;
  }

  private deduplicateMessages(
    messages: IConversationHistoryMessage[],
  ): IConversationHistoryMessage[] {
    const seen = new Set<string>();
    return messages.filter((message) => {
      const key = `${message.role}:${message.content}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}
