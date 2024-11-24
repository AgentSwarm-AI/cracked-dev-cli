import { FileOperations } from "@services/FileManagement/FileOperations";
import { autoInjectable } from "tsyringe";
import { ActionTagsExtractor } from "./ActionTagsExtractor";
import { moveFileAction as blueprint } from "./blueprints/moveFileAction";
import { BaseAction } from "./core/BaseAction";
import { IActionMetadata } from "./core/IAction";
import { IActionResult } from "./types/ActionTypes";

interface MoveFileParams {
  source_path: string;
  destination_path: string;
}

@autoInjectable()
export class MoveFileAction extends BaseAction {
  constructor(
    protected actionTagsExtractor: ActionTagsExtractor,
    private fileOperations: FileOperations,
  ) {
    super(actionTagsExtractor);
  }

  protected getBlueprint(): IActionMetadata {
    return blueprint;
  }

  protected parseParams(content: string): Record<string, any> {
    // First extract the content from the outer tag
    const tag = this.getBlueprint().tag;
    const match = content.match(new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`));
    if (!match) {
      this.logError("Failed to parse move file content");
      return { source_path: "", destination_path: "" };
    }

    const tagContent = match[0];
    const source_path = this.actionTagsExtractor.extractTag(
      tagContent,
      "source_path",
    );
    const destination_path = this.actionTagsExtractor.extractTag(
      tagContent,
      "destination_path",
    );

    const getValue = (value: string | string[] | null): string => {
      if (!value) return "";
      return Array.isArray(value) ? value[0]?.trim() || "" : value.trim();
    };

    return {
      source_path: getValue(source_path),
      destination_path: getValue(destination_path),
    };
  }

  protected validateParams(params: Record<string, any>): string | null {
    const { source_path, destination_path } = params as MoveFileParams;

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
      const { source_path, destination_path } = params as MoveFileParams;

      this.logInfo(`Source path: ${source_path}`);
      this.logInfo(`Destination path: ${destination_path}`);

      const result = await this.fileOperations.move(
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
