import { DebugLogger } from "@services/logging/DebugLogger";
import { singleton } from "tsyringe";
import { ConfigService } from "../ConfigService";
import { ModelManager } from "./ModelManager";
import { PhaseManager } from "./PhaseManager";
import { Phase } from "./types/PhaseTypes";

@singleton()
export class ModelScaler {
  private tryCountMap: Map<string, number> = new Map();
  private globalTryCount: number = 0;
  private autoScalerEnabled: boolean = false;

  constructor(
    private debugLogger: DebugLogger,
    private configService: ConfigService,
    private modelManager: ModelManager,
    private phaseManager: PhaseManager,
  ) {
    const config = this.configService.getConfig();
    this.autoScalerEnabled = config.autoScaler || false;
  }

  isAutoScalerEnabled(): boolean {
    return this.autoScalerEnabled;
  }

  async incrementTryCount(filePath: string): Promise<void> {
    const currentPhase = this.phaseManager.getCurrentPhase();

    if (!this.autoScalerEnabled || currentPhase !== Phase.Execute) {
      return;
    }

    this.incrementCounts(filePath);
    const currentCount = this.tryCountMap.get(filePath) || 0;

    // Only scale if we've exceeded the threshold
    if (currentCount > 3) {
      await this.handleModelScaling(filePath, currentCount);
    }
  }

  getTryCount(filePath: string): number {
    if (!this.autoScalerEnabled) return 0;
    return this.tryCountMap.get(filePath) || 0;
  }

  getGlobalTryCount(): number {
    if (!this.autoScalerEnabled) return 0;
    return this.globalTryCount;
  }

  reset(): void {
    this.tryCountMap.clear();
    this.globalTryCount = 0;
    const config = this.configService.getConfig();
    this.autoScalerEnabled = config.autoScaler || false;
    this.modelManager.setCurrentModel(config.discoveryModel);
  }

  private incrementCounts(filePath: string): void {
    if (!this.autoScalerEnabled) return;
    
    this.globalTryCount++;
    const currentCount = this.tryCountMap.get(filePath) || 0;
    this.tryCountMap.set(filePath, currentCount + 1);
  }

  private getMaxTryCount(): number {
    const values = Array.from(this.tryCountMap.values());
    return values.length > 0 ? Math.max(...values) : 0;
  }

  private async handleModelScaling(
    filePath: string,
    currentCount: number,
  ): Promise<void> {
    if (!this.autoScalerEnabled) return;

    const maxTries = this.getMaxTryCount();
    const newModel = this.getModelForTryCount(
      maxTries.toString(),
      this.globalTryCount,
    );

    this.debugLogger.log("Model", "Incrementing try count", {
      filePath,
      fileCount: currentCount + 1,
      globalCount: this.globalTryCount,
      maxTries,
      newModel,
      phase: this.phaseManager.getCurrentPhase(),
    });

    await this.modelManager.setCurrentModel(newModel);
  }

  private getModelForTryCount(
    tryCount: string | null,
    globalTries: number,
  ): string {
    const config = this.configService.getConfig();
    const availableModels = config.autoScaleAvailableModels;

    if (!tryCount) return availableModels[0].id;

    const tries = parseInt(tryCount, 10);

    for (let i = 0; i < availableModels.length; i++) {
      const previousTriesSum = availableModels
        .slice(0, i)
        .reduce((sum, model) => sum + model.maxWriteTries, 0);

      if (
        tries >= previousTriesSum + availableModels[i].maxWriteTries ||
        globalTries >= availableModels[i].maxGlobalTries
      ) {
        continue;
      }

      return availableModels[i].id;
    }

    return availableModels[availableModels.length - 1].id;
  }
}