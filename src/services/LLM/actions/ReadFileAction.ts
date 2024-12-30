import { FileOperations } from "@services/FileManagement/FileOperations";
import { IFileOperationResult } from "@services/FileManagement/types/FileManagementTypes";
import { IActionResult } from "@services/LLM/actions/types/ActionTypes";
import { DebugLogger } from "@services/logging/DebugLogger";
import { autoInjectable } from "tsyringe";
import { ActionTagsExtractor } from "./ActionTagsExtractor";
import { readFileActionBlueprint as blueprint } from "./blueprints/readFileActionBlueprint";
import { BaseAction } from "./core/BaseAction";
import { IActionBlueprint } from "./core/IAction";

interface IReadFileParams {
  path: string[];
}

@autoInjectable()
export class ReadFileAction extends BaseAction {
  constructor(
    protected actionTagsExtractor: ActionTagsExtractor,
    private fileOperations: FileOperations,
    private debugLogger: DebugLogger,
  ) {
    super(actionTagsExtractor);
  }

  protected getBlueprint(): IActionBlueprint {
    return blueprint;
  }

  protected validateParams(params: IReadFileParams): string | null {
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
    params: IReadFileParams,
  ): Promise<IActionResult> {
    // Extract paths either from path tags or from raw content
    const filePaths = Array.isArray(params.path) ? params.path : [params.path];

    // If only one path, use single file read
    if (filePaths.length === 1) {
      return await this.handleSingleFile(filePaths[0]);
    }

    // Handle multiple files
    return await this.handleMultipleFiles(filePaths);
  }

  private async handleSingleFile(filePath: string): Promise<IActionResult> {
    const result = await this.fileOperations.read(filePath);
    return this.convertFileResult(result, filePath);
  }

  private async handleMultipleFiles(
    filePaths: string[],
  ): Promise<IActionResult> {
    const result = await this.fileOperations.readMultiple(filePaths);
    this.debugLogger.log("ReadFileAction", "execute", result);

    if (!result.success || !result.data) {
      return this.createErrorResult(
        result.error || "Failed to read multiple files",
      );
    }

    this.logSuccess(`Read files: ${filePaths.join(", ")}\n`);
    console.log("-".repeat(50));

    return this.createSuccessResult(result.data);
  }

  private convertFileResult(
    result: IFileOperationResult,
    filePath?: string,
  ): IActionResult {
    if (result?.success) {
      this.logSuccess(`Read file: ${filePath}\n`);
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
