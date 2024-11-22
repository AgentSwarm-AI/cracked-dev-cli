import { openRouterClient } from "@constants/openRouterClient";
import { DebugLogger } from "@services/logging/DebugLogger";
import { autoInjectable, singleton } from "tsyringe";
import { IModelInfo } from "./types/ModelTypes";

@singleton()
@autoInjectable()
export class ModelInfo {
  private modelInfoMap: Map<string, IModelInfo> = new Map();
  private currentModel: string | null = null;
  private currentModelInfo: IModelInfo | null = null;
  private initialized: boolean = false;

  constructor(private debugLogger: DebugLogger) {}

  async initialize(): Promise<void> {
    try {
      const response = await openRouterClient.get("/models");
      const models: IModelInfo[] = response.data.data;

      // Clear existing models before adding new ones
      this.modelInfoMap.clear();

      models.forEach((model) => {
        this.modelInfoMap.set(model.id, model);
      });

      this.initialized = true;
    } catch (error) {
      this.debugLogger.log("ModelInfo", "Failed to initialize model list", {
        error,
      });
      throw error;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  async setCurrentModel(modelId: string): Promise<void> {
    await this.ensureInitialized();

    if (modelId === this.currentModel && this.currentModelInfo) {
      return; // Already tracking this model
    }

    const modelInfo = this.modelInfoMap.get(modelId);
    if (modelInfo) {
      this.currentModel = modelId;
      this.currentModelInfo = modelInfo;
      this.debugLogger.log("ModelInfo", "Current model info", {
        model: modelId,
        contextLength: modelInfo.context_length,
        maxCompletionTokens: modelInfo.top_provider.max_completion_tokens,
      });
    } else {
      const availableModels = Array.from(this.modelInfoMap.keys());
      this.debugLogger.log("ModelInfo", "Model not found in available models", {
        modelId,
        availableModels,
      });
      throw new Error(
        `Invalid model: ${modelId}. Available models: ${availableModels.join(", ")}`,
      );
    }
  }

  getCurrentModel(): string | null {
    return this.currentModel;
  }

  async getModelInfo(modelId: string): Promise<IModelInfo | undefined> {
    await this.ensureInitialized();
    return this.modelInfoMap.get(modelId);
  }

  getCurrentModelInfo(): IModelInfo | null {
    return this.currentModelInfo;
  }

  async getCurrentModelContextLength(): Promise<number> {
    await this.ensureInitialized();
    return this.currentModelInfo?.context_length || 128000; // Default fallback
  }

  async getModelContextLength(modelId: string): Promise<number> {
    await this.ensureInitialized();
    const modelInfo = await this.getModelInfo(modelId);
    return modelInfo?.context_length || 128000; // Default fallback
  }

  async getAllModels(): Promise<string[]> {
    await this.ensureInitialized();
    return Array.from(this.modelInfoMap.keys());
  }

  async isModelAvailable(modelId: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.modelInfoMap.has(modelId);
  }

  async getModelMaxCompletionTokens(modelId: string): Promise<number> {
    await this.ensureInitialized();
    const modelInfo = await this.getModelInfo(modelId);
    return modelInfo?.top_provider.max_completion_tokens || 4096; // Default fallback
  }

  async getCurrentModelMaxCompletionTokens(): Promise<number> {
    await this.ensureInitialized();
    return this.currentModelInfo?.top_provider.max_completion_tokens || 4096; // Default fallback
  }

  async logCurrentModelUsage(usedTokens: number): Promise<void> {
    await this.ensureInitialized();

    if (!this.currentModelInfo) {
      return;
    }

    const contextLength = this.currentModelInfo.context_length;
    const usagePercent = ((usedTokens / contextLength) * 100).toFixed(1);

    this.debugLogger.log("ModelInfo", "Token usage", {
      model: this.currentModel,
      used: usedTokens,
      total: contextLength,
      percentage: `${usagePercent}%`,
      remaining: contextLength - usedTokens,
    });
  }
}
