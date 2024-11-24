import { FileOperations } from "@services/FileManagement/FileOperations";
import { autoInjectable } from "tsyringe";
import { ActionTagsExtractor } from "./ActionTagsExtractor";
import { deleteFileAction as blueprint } from "./blueprints/deleteFileAction";
import { BaseAction } from "./core/BaseAction";
import { IActionMetadata } from "./core/IAction";
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

  protected getBlueprint(): IActionMetadata {
    return blueprint;
  }

  protected validateParams(params: Record<string, any>): string | null {
    const { path } = params as DeleteFileParams;

    if (!path) {
      return "No file path provided";
    }

    return null;
  }

  protected async executeInternal(
    params: Record<string, any>,
  ): Promise<IActionResult> {
    try {
      const { path: filePath } = params as DeleteFileParams;

      this.logInfo(`File path: ${filePath}`);
      const result = await this.fileOperations.delete(filePath);

      if (!result.success) {
        return this.createErrorResult(result.error!);
      }

      return this.createSuccessResult(result.data);
    } catch (error) {
      return this.createErrorResult(error as Error);
    }
  }
}
