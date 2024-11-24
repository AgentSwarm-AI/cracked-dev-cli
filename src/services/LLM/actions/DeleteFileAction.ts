import { FileOperations } from "@services/FileManagement/FileOperations";
import { autoInjectable } from "tsyringe";
import { ActionTagsExtractor } from "./ActionTagsExtractor";
import { deleteFileActionBlueprint as blueprint } from "./blueprints/deleteFileActionBlueprint";
import { BaseAction } from "./core/BaseAction";
import { IActionBlueprint } from "./core/IAction";
import { IActionResult } from "./types/ActionTypes";

interface DeleteFileParams {
  path: string;
}

@autoInjectable()
export class DeleteFileAction extends BaseAction {
  constructor(
    protected actionTagsExtractor: ActionTagsExtractor,
    private fileOperations: FileOperations,
  ) {
    super(actionTagsExtractor);
  }

  protected getBlueprint(): IActionBlueprint {
    return blueprint;
  }

  protected validateParams(params: Record<string, any>): string | null {
    const { path } = params as DeleteFileParams;

    if (typeof path !== "string" || !path.trim()) {
      return "Invalid or no file path provided";
    }

    return null;
  }

  protected async executeInternal(
    params: Record<string, any>,
  ): Promise<IActionResult> {
    try {
      const { path: filePath } = params as DeleteFileParams;

      this.logInfo(`Attempting to delete file at path: ${filePath}`);
      const result = await this.fileOperations.delete(filePath);

      if (!result.success) {
        this.logError(`Failed to delete file at path: ${filePath}. Error: ${result.error}`);
        return this.createErrorResult(result.error!);
      }

      this.logInfo(`Successfully deleted file at path: ${filePath}`);
      return this.createSuccessResult(result.data);
    } catch (error) {
      const { path: filePath } = params as DeleteFileParams;
      this.logError(`An unexpected error occurred while deleting file at path: ${filePath}. Error: ${error}`);
      return this.createErrorResult(error as Error);
    }
  }

  async execute(content: string): Promise<IActionResult> {
    let params: DeleteFileParams;
    try {
      params = JSON.parse(content) as DeleteFileParams;
    } catch (error) {
      return this.createErrorResult(new Error("Invalid JSON content"));
    }

    const validationError = this.validateParams(params);
    if (validationError) {
      return this.createErrorResult(new Error(validationError));
    }

    return this.executeInternal(params);
  }
}