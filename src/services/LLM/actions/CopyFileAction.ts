import { FileOperations } from "@services/FileManagement/FileOperations";
import { autoInjectable } from "tsyringe";
import { ActionTagsExtractor } from "./ActionTagsExtractor";
import { copyFileAction as blueprint } from "./blueprints/copyFileAction";
import { BaseAction } from "./core/BaseAction";
import { IActionMetadata } from "./core/IAction";
import { IActionResult } from "./types/ActionTypes";

interface CopyFileParams {
  source_path: string;
  destination_path: string;
}

@autoInjectable()
export class CopyFileAction extends BaseAction {
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
    const { source_path, destination_path } = params as CopyFileParams;

    if (!source_path) {
      return "No source path provided";
    }
    if (!destination_path) {
      return "No destination path provided";
    }

    return null;
  }

  protected async executeInternal(
    params: Record<string, any>,
  ): Promise<IActionResult> {
    try {
      const { source_path, destination_path } = params as CopyFileParams;

      this.logInfo(`Source path: ${source_path}`);
      this.logInfo(`Destination path: ${destination_path}`);

      const result = await this.fileOperations.copy(
        source_path,
        destination_path,
      );

      if (!result.success) {
        return this.createErrorResult(result.error!);
      }

      return this.createSuccessResult(result.data);
    } catch (error) {
      return this.createErrorResult(error as Error);
    }
  }
}
