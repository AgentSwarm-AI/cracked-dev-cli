import { FileOperations } from "@services/FileManagement/FileOperations";
import { FileSearch } from "@services/FileManagement/FileSearch";
import { IFileOperationResult } from "@services/FileManagement/types/FileManagementTypes";
import { IActionResult } from "@services/LLM/actions/types/ActionTypes";
import { DebugLogger } from "@services/logging/DebugLogger";
import path from "path";
import { autoInjectable } from "tsyringe";
import { ActionTagsExtractor } from "./ActionTagsExtractor";
import { readFileAction as blueprint } from "./blueprints/readFileAction";
import { BaseAction } from "./core/BaseAction";
import { IActionMetadata } from "./core/IAction";

interface ReadFileParams {
  path: string[];
}

@autoInjectable()
export class ReadFileAction extends BaseAction {
  constructor(
    protected actionTagsExtractor: ActionTagsExtractor,
    private fileOperations: FileOperations,
    private debugLogger: DebugLogger,
    private fileSearch: FileSearch,
  ) {
    super(actionTagsExtractor);
  }

  protected getBlueprint(): IActionMetadata {
    return blueprint;
  }

  protected validateParams(params: Record<string, any>): string | null {
    const paths = params.path;

    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return "Must include at least one <path> tag";
    }

    const invalidPaths = paths.filter((path) => !path);
    if (invalidPaths.length > 0) {
      return `Invalid paths found: ${invalidPaths.join(", ")}. Try using a <search_file> to find the correct file path.`;
    }

    return null;
  }

  protected extractParamValue(
    content: string,
    paramName: string,
  ): string | string[] | null {
    if (paramName === "path") {
      // Extract all path tags
      const regex = new RegExp(`<${paramName}>(.*?)</${paramName}>`, "g");
      const matches = Array.from(content.matchAll(regex));
      const paths = matches.map((match) => match[1].trim());
      return paths.length > 0 ? paths : null;
    }

    // Use default extraction for other parameters
    return super.extractParamValue(content, paramName);
  }

  protected async executeInternal(
    params: Record<string, any>,
  ): Promise<IActionResult> {
    // Extract paths either from path tags or from raw content
    const filePaths = Array.isArray(params.path) ? params.path : [params.path];
    this.logInfo(`File paths: ${filePaths.join(", ")}`);

    // If only one path, use single file read for backward compatibility
    if (filePaths.length === 1) {
      return await this.handleSingleFile(filePaths[0]);
    }

    // Handle multiple files
    return await this.handleMultipleFiles(filePaths);
  }

  private async handleSingleFile(filePath: string): Promise<IActionResult> {
    const exists = await this.fileOperations.exists(filePath);
    if (!exists) {
      const fileName = path.basename(filePath);
      const searchResults = await this.fileSearch.findByName(
        fileName,
        process.cwd(),
      );

      if (searchResults.length > 0) {
        this.logInfo(
          `File not found at specified path. Found alternative(s): ${searchResults.join(", ")}`,
        );
        const result = await this.fileOperations.read(searchResults[0]);
        return this.convertFileResult(result);
      }
    }

    const result = await this.fileOperations.read(filePath);
    return this.convertFileResult(result);
  }

  private async handleMultipleFiles(
    filePaths: string[],
  ): Promise<IActionResult> {
    const resolvedPaths = await Promise.all(
      filePaths.map(async (filePath) => {
        const exists = await this.fileOperations.exists(filePath);
        if (!exists) {
          const fileName = path.basename(filePath);
          const searchResults = await this.fileSearch.findByName(
            fileName,
            process.cwd(),
          );
          if (searchResults.length > 0) {
            this.logInfo(
              `File not found at ${filePath}. Found at: ${searchResults[0]}`,
            );
            return searchResults[0];
          }
        }
        return filePath;
      }),
    );

    const result = await this.fileOperations.readMultiple(resolvedPaths);
    this.debugLogger.log("ReadFileAction", "execute", result);

    if (!result.success || !result.data) {
      return this.createErrorResult(
        result.error || "Failed to read multiple files",
      );
    }

    const fileContent = result.data.toString();

    // Verify all requested files are present in the result
    const missingFiles = resolvedPaths.filter(
      (path) => !fileContent.includes(`[File: ${path}]`),
    );

    if (missingFiles.length > 0) {
      return this.createErrorResult(
        `Failed to read files: ${missingFiles.join(", ")}. Try using search_file action to find the proper path.`,
      );
    }

    this.logSuccess("Action completed successfully. Please wait...\n");
    console.log("-".repeat(50));

    return this.createSuccessResult(fileContent);
  }

  private convertFileResult(result: IFileOperationResult): IActionResult {
    if (result?.success) {
      this.logSuccess("Action completed successfully. Please wait...\n");
    } else {
      this.logError(result?.error?.message || "Unknown error");
    }

    console.log("-".repeat(50));

    return {
      success: !!result?.success,
      data: result?.data,
      error: result?.error,
    };
  }
}
