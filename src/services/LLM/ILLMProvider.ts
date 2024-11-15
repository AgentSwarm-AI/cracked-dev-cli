export interface IMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface IBaseModelInfo {
  id: string;
  name: string;
}

export interface ILLMProvider {
  // Core message handling
  sendMessage(model: string, message: string): Promise<string>;
  sendMessageWithContext(
    model: string,
    message: string,
    systemInstructions?: string,
  ): Promise<string>;

  // Conversation management
  clearConversationContext(): void;
  getConversationContext(): IMessage[];
  addSystemInstructions(instructions: string): void;

  // Model management
  getAvailableModels(): Promise<string[]>;
  validateModel(model: string): Promise<boolean>;
  getModelInfo(model: string): Promise<Record<string, unknown>>;

  // Stream support for real-time responses
  streamMessage(
    model: string,
    message: string,
    callback: (chunk: string) => void,
  ): Promise<void>;
}
