import { DebugLogger } from "@services/logging/DebugLogger";
import { singleton } from "tsyringe";
import { ModelInfo } from "./ModelInfo";

@singleton()
export class ModelManager {
  private currentModel: string = "";

  constructor(
    private modelInfo: ModelInfo,
    private debugLogger: DebugLogger,
  ) {}

  public setCurrentModel(model: string): void {
    this.currentModel = model;
    this.modelInfo.setCurrentModel(model);
    this.debugLogger.log("ModelManager", "Model updated", { model });
  }

  public getCurrentModel(): string {
    return this.currentModel;
  }
}
