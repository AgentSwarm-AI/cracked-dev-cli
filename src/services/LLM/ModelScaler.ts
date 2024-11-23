import { getModelForTryCount } from "@constants/modelScaling";
import { ConversationContext } from "@services/LLM/ConversationContext";
import { ModelInfo } from "@services/LLM/ModelInfo";
import { DebugLogger } from "@services/logging/DebugLogger";
import { singleton } from "tsyringe";
import { MessageContextManager } from "./MessageContextManager";

@singleton()
export class ModelScaler {
  private tryCountMap: Map<string, number> = new Map();
  private globalTryCount: number = 0;
  private currentModel: string;
  private autoScalerEnabled: boolean = false;
  private userSpecifiedModel: string | null = null;

  constructor(
    private debugLogger: DebugLogger,
    private messageContextManager: MessageContextManager,
    private conversationContext: ConversationContext,
    private modelInfo: ModelInfo,
  ) {
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

  setAutoScaler(enabled: boolean, userModel?: string): void {
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
      this.handleModelChange(newModel);
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
      this.handleModelChange(baseModel);
    }
    this.debugLogger.log("Model", "Auto scaler setting updated", {
      enabled,
      userSpecifiedModel: this.userSpecifiedModel,
    });
  }

  isAutoScalerEnabled(): boolean {
    return this.autoScalerEnabled;
  }

  incrementTryCount(filePath: string): void {
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
    this.handleModelChange(newModel);
  }

  private async handleModelChange(newModel: string): Promise<void> {
    if (newModel === this.currentModel) return;

    const oldModel = this.currentModel;
    this.currentModel = newModel;
    await this.modelInfo.setCurrentModel(newModel);

    // Get context limit for new model
    const contextLimit = await this.modelInfo.getModelContextLength(newModel);

    this.debugLogger.log("Model", "Checking context for model change", {
      oldModel,
      newModel,
      contextLimit,
      currentTokens: this.messageContextManager.getTotalTokenCount(),
    });

    // Clean up context if needed for new model
    const wasCleanupPerformed =
      this.conversationContext.cleanupContext(contextLimit);

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

  setTryCount(filePath: string, count: number): void {
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
    this.handleModelChange(newModel);
  }

  reset(): void {
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
    this.handleModelChange(newModel);
  }

  getTryCount(filePath: string): number {
    return this.tryCountMap.get(filePath) || 0;
  }

  getGlobalTryCount(): number {
    return this.globalTryCount;
  }
}
