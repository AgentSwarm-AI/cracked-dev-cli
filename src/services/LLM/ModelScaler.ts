import { getModelForTryCount } from "@constants/modelScaling";
import { ConversationContext } from "@services/LLM/ConversationContext";
import { ModelInfo } from "@services/LLM/ModelInfo";
import { DebugLogger } from "@services/logging/DebugLogger";
import { singleton } from "tsyringe";
import { MessageContextManager } from "./MessageContextManager";

@singleton()
export class ModelScaler {
  private tryCountMap: Map<string, number> = new Map();
  private currentModel: string;
  private autoScalerEnabled: boolean = false;

  constructor(
    private debugLogger: DebugLogger,
    private messageContextManager: MessageContextManager,
    private conversationContext: ConversationContext,
    private modelInfo: ModelInfo,
  ) {
    // Initialize with base model
    this.currentModel = getModelForTryCount(null);
    this.modelInfo.setCurrentModel(this.currentModel);
    this.debugLogger.log("Model", "Initialized model scaler", {
      model: this.currentModel,
    });
  }

  getCurrentModel(): string {
    return this.currentModel;
  }

  setAutoScaler(enabled: boolean): void {
    this.autoScalerEnabled = enabled;
    if (!enabled) {
      // Clear try counts when disabling auto-scaler
      this.tryCountMap.clear();
      const newModel = getModelForTryCount(null);
      this.handleModelChange(newModel);
      this.debugLogger.log(
        "Model",
        "Auto scaler disabled, reset to base model",
        {
          model: this.currentModel,
        },
      );
    }
    this.debugLogger.log("Model", "Auto scaler setting updated", {
      enabled,
    });
  }

  isAutoScalerEnabled(): boolean {
    return this.autoScalerEnabled;
  }

  incrementTryCount(filePath: string): void {
    if (!this.autoScalerEnabled) return;
    const currentCount = this.tryCountMap.get(filePath) || 0;
    this.setTryCount(filePath, currentCount + 1);
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
    });

    this.tryCountMap.set(filePath, count);

    // Get the highest try count among all files
    const maxTries = Math.max(...Array.from(this.tryCountMap.values()));
    const newModel = getModelForTryCount(maxTries.toString());

    // Handle model change if needed
    this.handleModelChange(newModel);
  }

  reset(): void {
    this.tryCountMap.clear();
    const newModel = getModelForTryCount(null);

    this.debugLogger.log("Model", "Resetting model scaler", {
      oldModel: this.currentModel,
      newModel,
    });

    // Handle model change if needed
    this.handleModelChange(newModel);
  }

  getTryCount(filePath: string): number {
    return this.tryCountMap.get(filePath) || 0;
  }
}
