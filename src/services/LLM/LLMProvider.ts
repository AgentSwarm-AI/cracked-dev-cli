import { autoInjectable, container, singleton } from "tsyringe";
import { OpenRouterAPI } from "../LLMProviders/OpenRouter/OpenRouterAPI";
import { ILLMProvider, IMessage } from "./ILLMProvider";

export enum LLMProviderType {
  OpenRouter = "open-router",
}

@singleton()
@autoInjectable()
export class LLMProvider implements ILLMProvider {
  private providers: Map<LLMProviderType, ILLMProvider>;
  private currentProvider: ILLMProvider | null = null;

  constructor() {
    this.providers = new Map();
    this.initializeProvider(LLMProviderType.OpenRouter);
  }

  private initializeProvider(type: LLMProviderType): void {
    let provider: ILLMProvider;

    switch (type) {
      case LLMProviderType.OpenRouter:
        provider = container.resolve(OpenRouterAPI);
        break;
      default:
        throw new Error(`Unsupported provider type: ${type}`);
    }

    this.providers.set(type, provider);
    this.currentProvider = provider;
  }

  public static getInstance(type: LLMProviderType): ILLMProvider {
    const provider = container.resolve(LLMProvider).getProvider(type);
    if (!provider) {
      throw new Error(`Unsupported provider type: ${type}`);
    }
    return provider;
  }

  private getProvider(type: LLMProviderType): ILLMProvider | undefined {
    return this.providers.get(type);
  }

  public sendMessage(
    model: string,
    message: string,
    options?: Record<string, unknown>,
  ): Promise<string> {
    if (!this.currentProvider) {
      throw new Error("Current provider not set");
    }
    return this.currentProvider.sendMessage(model, message, options);
  }

  public sendMessageWithContext(
    model: string,
    message: string,
    systemInstructions?: string,
    options?: Record<string, unknown>,
  ): Promise<string> {
    if (!this.currentProvider) {
      throw new Error("Current provider not set");
    }
    return this.currentProvider.sendMessageWithContext(model, message, systemInstructions, options);
  }

  public clearConversationContext(): void {
    if (!this.currentProvider) {
      throw new Error("Current provider not set");
    }
    this.currentProvider.clearConversationContext();
  }

  public getConversationContext(): IMessage[] {
    if (!this.currentProvider) {
      throw new Error("Current provider not set");
    }
    return this.currentProvider.getConversationContext();
  }

  public addSystemInstructions(instructions: string): void {
    if (!this.currentProvider) {
      throw new Error("Current provider not set");
    }
    this.currentProvider.addSystemInstructions(instructions);
  }

  public getAvailableModels(): Promise<string[]> {
    if (!this.currentProvider) {
      throw new Error("Current provider not set");
    }
    return this.currentProvider.getAvailableModels();
  }

  public validateModel(model: string): Promise<boolean> {
    if (!this.currentProvider) {
      throw new Error("Current provider not set");
    }
    return this.currentProvider.validateModel(model);
  }

  public getModelInfo(model: string): Promise<Record<string, unknown>> {
    if (!this.currentProvider) {
      throw new Error("Current provider not set");
    }
    return this.currentProvider.getModelInfo(model);
  }

  public streamMessage(
    model: string,
    message: string,
    callback: (chunk: string) => void,
    options?: Record<string, unknown>,
  ): Promise<void> {
    if (!this.currentProvider) {
      throw new Error("Current provider not set");
    }
    return this.currentProvider.streamMessage(model, message, callback, options);
  }
}