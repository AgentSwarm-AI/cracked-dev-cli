import { container } from "tsyringe";
import { OpenRouterAPI } from "../LLMProviders/OpenRouter/OpenRouterAPI";
import { ILLMProvider } from "./ILLMProvider";

export enum LLMProviderType {
  OpenRouter = "open-router",
}

export class LLMProvider {
  private static instance: LLMProvider | null = null;
  private providers: Map<LLMProviderType, ILLMProvider>;
  private currentProvider: ILLMProvider | null = null;

  private constructor(type: LLMProviderType) {
    if (!type) {
      throw new Error("Provider type must be specified");
    }
    this.providers = new Map();
    this.initializeProvider(type);
  }

  private initializeProvider(type: LLMProviderType): void {
    let provider: ILLMProvider;

    switch (type) {
      case LLMProviderType.OpenRouter: {
        const openRouterAPI = container.resolve(OpenRouterAPI);

        provider = openRouterAPI;
        break;
      }
      default:
        throw new Error(`Unsupported provider type: ${type}`);
    }

    this.providers.set(type, provider);
    this.currentProvider = provider;
  }

  public static getInstance(type: LLMProviderType): ILLMProvider {
    if (!LLMProvider.instance) {
      LLMProvider.instance = new LLMProvider(type);
    }

    const provider = LLMProvider.instance.currentProvider;
    if (!provider) {
      throw new Error(`No provider initialized`);
    }

    return provider;
  }

  public static async validateProvider(
    type: LLMProviderType,
    model: string,
  ): Promise<boolean> {
    const provider = LLMProvider.getInstance(type);
    return provider.validateModel(model);
  }

  public static async getAvailableModels(
    type: LLMProviderType,
  ): Promise<string[]> {
    const provider = LLMProvider.getInstance(type);
    return provider.getAvailableModels();
  }

  public static async getModelInfo(
    type: LLMProviderType,
    model: string,
  ): Promise<Record<string, unknown>> {
    const provider = LLMProvider.getInstance(type);
    return provider.getModelInfo(model);
  }
}
