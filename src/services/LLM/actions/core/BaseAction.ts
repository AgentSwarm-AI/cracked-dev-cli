import { ActionTagsExtractor } from "../ActionTagsExtractor";
import { IActionResult } from "../types/ActionTypes";
import { IAction, IActionBlueprint, IActionParameter } from "./IAction";

export abstract class BaseAction implements IAction {
  constructor(protected actionTagsExtractor: ActionTagsExtractor) {}

  protected abstract executeInternal(
    params: Record<string, any>,
  ): Promise<IActionResult>;
  protected abstract validateParams(params: Record<string, any>): string | null;
  protected abstract getBlueprint(): IActionBlueprint;

  protected parseParams(content: string): Record<string, any> {
    const blueprint = this.getBlueprint();
    const paramNames =
      blueprint.parameters?.map((p: IActionParameter) => p.name) || [];

    const params: Record<string, any> = {};
    for (const paramName of paramNames) {
      const value = this.extractParamValue(content, paramName);
      if (value !== null) {
        params[paramName] = value;
      }
    }

    return params;
  }

  // Allow actions to override this method for custom parameter extraction
  protected extractParamValue(
    content: string,
    paramName: string,
  ): string | string[] | null {
    return this.actionTagsExtractor.extractTag(content, paramName);
  }

  async execute(content: string): Promise<IActionResult> {
    try {
      // Get blueprint for validation
      const blueprint = this.getBlueprint();
      if (!blueprint) {
        return this.createErrorResult("Action blueprint not found");
      }

      // Parse parameters from content
      const params = this.parseParams(content);

      // Validate parameters
      const validationError = this.validateParams(params);
      if (validationError) {
        this.logError(validationError);
        return this.createErrorResult(validationError);
      }

      // Execute action-specific logic
      const result = await this.executeInternal(params);

      // Log result for debugging
      if (result.success) {
        // if base action is read_file, skip
        if (this.getBlueprint().tag === "read_file") {
          return result;
        }

        this.logSuccess(`Action executed successfully`);
      } else {
        this.logError(`Action execution failed: ${result.error?.message}`);
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logError(errorMessage);
      return this.createErrorResult(error as Error);
    }
  }

  protected logError(message: string): void {
    console.error(`🚫 ${this.getBlueprint().tag}: ${message}`);
  }

  protected logInfo(message: string): void {
    console.log(`ℹ️ ${this.getBlueprint().tag}: ${message}`);
  }

  protected logSuccess(message: string): void {
    console.log(`✅ ${this.getBlueprint().tag}: ${message}`);
  }

  protected createSuccessResult(data?: any): IActionResult {
    return {
      success: true,
      data,
    };
  }

  protected createErrorResult(error: string | Error): IActionResult {
    const errorObj = typeof error === "string" ? new Error(error) : error;
    return {
      success: false,
      error: errorObj,
    };
  }
}
