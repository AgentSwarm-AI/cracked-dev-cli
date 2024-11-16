import { autoInjectable, container, singleton } from "tsyringe";
import { OpenRouterAPI } from "../LLMProviders/OpenRouter/OpenRouterAPI";
import { ILLMProvider } from "./ILLMProvider";

export enum LLMProviderType {
  OpenRouter = "open-router",
}

@singleton()
@autoInjectable()
export class LLMProvider {
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
  }

  public static getInstance(type: LLMProviderType): ILLMProvider {
    const provider = container.resolve(LLMProvider).getProvider(type);
    if (!provider) {
      throw new Error(`Provider not initialized: ${type}`);
    }
    return provider;
  }

  private getProvider(type: LLMProviderType): ILLMProvider | undefined {
    return this.providers.get(type);
  }
}
