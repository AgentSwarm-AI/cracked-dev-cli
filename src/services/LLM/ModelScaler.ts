import { getModelForTryCount } from "@constants/modelScaling";
import { ConversationContext } from "@services/LLM/ConversationContext";
import { ModelInfo } from "@services/LLM/ModelInfo";
import { DebugLogger } from "@services/logging/DebugLogger";
import { singleton } from "tsyringe";
import { ConfigService } from "../ConfigService";
import { MessageContextManager } from "./MessageContextManager";

@singleton()
export class ModelScaler {
  private tryCountMap: Map<string, number> = new Map();
  private globalTryCount: number;
  private currentModel: string;
  private autoScalerEnabled: boolean;
  private userSpecifiedModel: string | null = null;

  constructor(
    private debugLogger: DebugLogger,
    private messageContextManager: MessageContextManager,
    private conversationContext: ConversationContext,
    private modelInfo: ModelInfo,
    private configService: ConfigService,
  ) {
    // Set autoScalerEnabled from crkdrc.json
    const config = this.configService.getConfig();
    this.autoScalerEnabled = config.autoScaler ?? false;

    // Set autoScaleMaxTryPerModel from crkdrc.json
    this.globalTryCount = config.autoScaleMaxTryPerModel ?? 0;

    // Initialize with base model
    this.currentModel = getModelForTryCount(null, this.globalTryCount);
    this.modelInfo.setCurrentModel(this.currentModel);
    this.debugLogger.log("Model", "Initialized model scaler", {
      model: this.currentModel,
    });
  }

  getCurrentModel(): string {
    // If auto-scaler is disabled, return user specified model or base model
    if (!this.autoScalerEnabled) {
      return this.userSpecifiedModel || this.currentModel;
    }
    return this.currentModel;
  }

  async setAutoScaler(enabled: boolean, userModel?: string): Promise<void> {
    this.autoScalerEnabled = enabled;
    if (!enabled) {
      // Store user specified model when disabling auto-scaler
      this.userSpecifiedModel = userModel || null;
      // Clear try counts when disabling auto-scaler
      this.tryCountMap.clear();
      this.globalTryCount = 0;
      const newModel =
        this.userSpecifiedModel ||
        getModelForTryCount(null, this.globalTryCount);
      await this.handleModelChange(newModel);
      this.debugLogger.log(
        "Model",
        "Auto scaler disabled, using specified model",
        {
          model: this.currentModel,
          userSpecifiedModel: this.userSpecifiedModel,
        },
      );
    } else {
      // Clear user specified model and reset to base model when enabling auto-scaler
      this.userSpecifiedModel = null;
      this.tryCountMap.clear();
      this.globalTryCount = 0;
      const baseModel = getModelForTryCount(null, this.globalTryCount);
      await this.handleModelChange(baseModel);
    }
    this.debugLogger.log("Model", "Auto scaler setting updated", {
      enabled,
      userSpecifiedModel: this.userSpecifiedModel,
    });
  }

  isAutoScalerEnabled(): boolean {
    return this.autoScalerEnabled;
  }

  async incrementTryCount(filePath: string): Promise<void> {
    if (!this.autoScalerEnabled) return;

    this.globalTryCount++; // Increment global try count first

    const currentCount = this.tryCountMap.get(filePath) || 0;
    this.tryCountMap.set(filePath, currentCount + 1);

    // Get the highest try count among all files
    const maxTries = Math.max(...Array.from(this.tryCountMap.values()));

    // Use both maxTries and globalTryCount to determine the model
    const newModel = getModelForTryCount(
      maxTries.toString(),
      this.globalTryCount,
    );

    this.debugLogger.log("Model", "Incrementing try count", {
      filePath,
      currentCount: currentCount + 1,
      globalTryCount: this.globalTryCount,
      newModel,
    });

    // Handle model change if needed
    await this.handleModelChange(newModel);
  }

  private async handleModelChange(newModel: string): Promise<void> {
    if (newModel === this.currentModel) return;

    const oldModel = this.currentModel;
    this.currentModel = newModel;
    await this.modelInfo.setCurrentModel(newModel);

    this.debugLogger.log("Model", "Checking context for model change", {
      oldModel,
      newModel,
      currentTokens: this.messageContextManager.getTotalTokenCount(),
    });

    // Clean up context if needed for new model
    const wasCleanupPerformed = await this.conversationContext.cleanupContext();

    if (wasCleanupPerformed) {
      this.debugLogger.log("Model", "Context cleaned up for model change", {
        newModel,
        newTokenCount: this.messageContextManager.getTotalTokenCount(),
      });
    }

    // Log token usage after potential cleanup
    await this.modelInfo.logCurrentModelUsage(
      this.messageContextManager.getTotalTokenCount(),
    );
  }

  async setTryCount(filePath: string, count: number): Promise<void> {
    if (!this.autoScalerEnabled) return;

    this.debugLogger.log("Model", "Setting try count", {
      filePath,
      count,
      globalTryCount: this.globalTryCount,
    });

    this.tryCountMap.set(filePath, count);

    // Get the highest try count among all files
    const maxTries = Math.max(...Array.from(this.tryCountMap.values()));
    const newModel = getModelForTryCount(
      maxTries.toString(),
      this.globalTryCount,
    );

    // Handle model change if needed
    await this.handleModelChange(newModel);
  }

  async reset(): Promise<void> {
    this.tryCountMap.clear();
    this.globalTryCount = 0;
    // When resetting, respect user specified model if auto-scaler is disabled
    const newModel =
      !this.autoScalerEnabled && this.userSpecifiedModel
        ? this.userSpecifiedModel
        : getModelForTryCount(null, this.globalTryCount);

    this.debugLogger.log("Model", "Resetting model scaler", {
      oldModel: this.currentModel,
      newModel,
      userSpecifiedModel: this.userSpecifiedModel,
    });

    // Handle model change if needed
    await this.handleModelChange(newModel);
  }

  getTryCount(filePath: string): number {
    return this.tryCountMap.get(filePath) || 0;
  }

  getGlobalTryCount(): number {
    return this.globalTryCount;
  }
}
