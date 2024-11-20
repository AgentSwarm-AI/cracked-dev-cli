import { singleton } from "tsyringe";
import { getModelForTryCount } from "../../constants/modelScaling";
import { DebugLogger } from "../logging/DebugLogger";

@singleton()
export class ModelScaler {
  private tryCountMap: Map<string, number> = new Map();
  private currentModel: string;

  constructor(private debugLogger: DebugLogger) {
    // Initialize with base model
    this.currentModel = getModelForTryCount(null);
    this.debugLogger.log("Model", "Initialized model scaler", {
      model: this.currentModel,
    });
  }

  getCurrentModel(): string {
    return this.currentModel;
  }

  incrementTryCount(filePath: string): void {
    const currentCount = this.tryCountMap.get(filePath) || 0;
    this.setTryCount(filePath, currentCount + 1);
  }

  setTryCount(filePath: string, count: number): void {
    console.log("Setting try count", filePath, count);
    this.tryCountMap.set(filePath, count);

    // Get the highest try count among all files
    const maxTries = Math.max(...Array.from(this.tryCountMap.values()));
    const newModel = getModelForTryCount(maxTries.toString());

    if (newModel !== this.currentModel) {
      this.currentModel = newModel;
      this.debugLogger.log("Model", "Updated model based on file try count", {
        filePath,
        tryCount: count,
        maxTries,
        model: this.currentModel,
      });
    }
  }

  reset(): void {
    this.tryCountMap.clear();
    this.currentModel = getModelForTryCount(null);
    this.debugLogger.log("Model", "Reset model scaling", {
      model: this.currentModel,
    });
  }

  getTryCount(filePath: string): number {
    return this.tryCountMap.get(filePath) || 0;
  }
}
