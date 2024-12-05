import { DebugLogger } from "@services/logging/DebugLogger";
import { singleton } from "tsyringe";
import { ConfigService } from "../ConfigService";
import { MessageContextManager } from "./MessageContextManager";
import { ModelInfo } from "./ModelInfo";

@singleton()
export class ModelManager {
  private currentModel: string;

  constructor(
    private debugLogger: DebugLogger,
    private modelInfo: ModelInfo,
    private messageContextManager: MessageContextManager,
    private configService: ConfigService,
  ) {
    // Initialize with discovery phase model from config
    const config = this.configService.getConfig();
    this.currentModel = config.discoveryModel;
    this.modelInfo.setCurrentModel(this.currentModel);
    this.debugLogger.log("Model", "Initialized model manager", {
      model: this.currentModel,
    });
  }

  getCurrentModel(): string {
    return this.currentModel;
  }

  async setCurrentModel(model: string): Promise<void> {
    if (model === this.currentModel) return;

    const oldModel = this.currentModel;
    this.currentModel = model;
    await this.modelInfo.setCurrentModel(model);

    this.debugLogger.log("Model", "Checking context for model change", {
      oldModel,
      newModel: model,
      currentTokens: this.messageContextManager.getTotalTokenCount(),
    });

    // Clean up context if needed for new model
    const wasCleanupPerformed =
      await this.messageContextManager.cleanupContext();

    if (wasCleanupPerformed) {
      this.debugLogger.log("Model", "Context cleaned up for model change", {
        newModel: model,
        newTokenCount: this.messageContextManager.getTotalTokenCount(),
      });
    }

    // Log token usage after potential cleanup
    await this.modelInfo.logCurrentModelUsage(
      this.messageContextManager.getTotalTokenCount(),
    );
  }
}
