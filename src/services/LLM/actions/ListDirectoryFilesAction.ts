import { DirectoryScanner } from "@/services/FileManagement/DirectoryScanner";
import { DebugLogger } from "@/services/logging/DebugLogger";
import fs from "fs";
import path from "path";
import { autoInjectable } from "tsyringe";
import { ActionTagsExtractor } from "./ActionTagsExtractor";
import { BaseAction } from "./core/BaseAction";
import { IActionBlueprint } from "./core/IAction";
import { IActionResult } from "./types/ActionTypes";

interface IListDirectoryFilesParams {
  path: string | string[];
  recursive?: boolean;
}

@autoInjectable()
export class ListDirectoryFilesAction extends BaseAction {
  protected getBlueprint(): IActionBlueprint {
    return {
      tag: "list_directory_files",
      class: ListDirectoryFilesAction,
      description: "Lists files in one or more directories",
      usageExplanation:
        "Use this action to list all files within one or more directories. Optionally, enable recursive listing.",
      parameters: [
        {
          name: "path",
          required: true,
          description:
            "Path or paths to the directories (can use multiple <path> tags)",
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
      return "Must include at least one <path> tag";
    }

    const paths = Array.isArray(params.path) ? params.path : [params.path];

    for (const dirPath of paths) {
      try {
        const absolutePath = path.resolve(dirPath);
        const stats = fs.statSync(absolutePath);

        if (!stats.isDirectory()) {
          return `Path '${dirPath}' exists but is not a directory`;
        }
      } catch (error) {
        return `Invalid or inaccessible path: ${dirPath}`;
      }
    }

    return null;
  }

  protected async executeInternal(
    params: IListDirectoryFilesParams,
  ): Promise<IActionResult> {
    const paths = Array.isArray(params.path) ? params.path : [params.path];
    const allResults: string[] = [];

    for (const dirPath of paths) {
      const result = await this.directoryScanner.scan(dirPath, {
        maxDepth: params.recursive ? undefined : 1,
      });

      if (!result.success || !result.data) {
        return this.createErrorResult(
          `Failed to list directory contents for path: ${dirPath}. ${result.error || ""}`,
        );
      }

      let content: string;
      try {
        content =
          typeof result.data === "string"
            ? result.data
            : JSON.stringify(result.data, null, 2);
      } catch (error) {
        return this.createErrorResult(
          `Failed to process directory contents for path: ${dirPath}. ${error.message}`,
        );
      }

      allResults.push(content);
    }

    this.logSuccess("Directory listing completed successfully.\n");
    return this.createSuccessResult(allResults.join("\n"));
  }
}
