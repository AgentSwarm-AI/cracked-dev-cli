import { autoInjectable } from "tsyringe";
import { BaseAction } from "./core/BaseAction";
import { IActionBlueprint } from "./core/IAction";
import { ActionTagsExtractor } from "./ActionTagsExtractor";
import { DirectoryScanner } from "@/services/FileManagement/DirectoryScanner";
import { DebugLogger } from "@/services/logging/DebugLogger";
import { IActionResult } from "./types/ActionTypes";

interface IListDirectoryFilesParams {
  path: string;
  recursive?: boolean;
}

@autoInjectable()
export class ListDirectoryFilesAction extends BaseAction {
  protected getBlueprint(): IActionBlueprint {
    return {
      tag: "list_directory_files",
      class: ListDirectoryFilesAction,
      description: "Lists files in a specified directory",
      usageExplanation:
        "Use this action to list all files within a directory. Optionally, enable recursive listing.",
      parameters: [
        {
          name: "path",
          required: true,
          description: "Path to the directory",
          mayContainNestedContent: false,
        },
        {
          name: "recursive",
          required: false,
          description: "Enable recursive listing",
          mayContainNestedContent: false,
        },
      ],
    };
  }
  constructor(
    protected actionTagsExtractor: ActionTagsExtractor,
    private directoryScanner: DirectoryScanner,
    private debugLogger: DebugLogger,
  ) {
    super(actionTagsExtractor);
  }

  protected validateParams(params: IListDirectoryFilesParams): string | null {
    if (!params.path) {
      return "Must include a <path> tag";
    }
    return null;
  }

  protected async executeInternal(
    params: IListDirectoryFilesParams,
  ): Promise<IActionResult> {
    const result = await this.directoryScanner.scan(params.path, {
      maxDepth: params.recursive ? undefined : 1,
    });

    if (!result.success || !result.data) {
      return this.createErrorResult(
        result.error || "Failed to list directory contents",
      );
    }

    this.logSuccess("Directory listing completed successfully.\n");
    return this.createSuccessResult(result.data);
  }
}
