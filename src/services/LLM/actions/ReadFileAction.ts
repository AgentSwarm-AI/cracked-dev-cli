import { autoInjectable } from "tsyringe";
import { FileOperations } from "../../FileManagement/FileOperations";
import { IFileOperationResult } from "../../FileManagement/types/FileManagementTypes";
import { DebugLogger } from "../../logging/DebugLogger";
import { ActionTagsExtractor } from "./ActionTagsExtractor";
import { IActionResult } from "./types/ActionTypes";

@autoInjectable()
export class ReadFileAction {
  constructor(
    private fileOperations: FileOperations,
    private actionTagsExtractor: ActionTagsExtractor,
    private debugLogger: DebugLogger,
  ) {}

  async execute(content: string): Promise<IActionResult> {
    const filePaths = this.actionTagsExtractor.extractTags(content, "path");
    if (filePaths.length === 0) {
      return {
        success: false,
        error: new Error(
          "Invalid read_file format. Must include at least one <path> tag.",
        ),
      };
    }

    console.log(`📁 File paths: ${filePaths.join(", ")}`);

    // Handle empty file path
    const invalidPaths = filePaths.filter((path) => !path);
    if (invalidPaths.length > 0) {
      return {
        success: false,
        error: new Error(`Failed to read files: ${invalidPaths.join(", ")}`),
      };
    }

    // If only one path, use single file read for backward compatibility
    if (filePaths.length === 1) {
      const result = await this.fileOperations.read(filePaths[0]);
      return this.convertFileResult(result);
    }

    // Multiple paths, use readMultiple
    const result = await this.fileOperations.readMultiple(filePaths);

    this.debugLogger.log("ReadFileAction", "execute", result);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || new Error("Failed to read multiple files"),
      };
    }

    // Ensure data is of type Record<string, string>
    const fileContents = result.data as Record<string, string>;

    // Validate that all requested files were read
    const missingFiles = filePaths.filter((path) => !(path in fileContents));
    if (missingFiles.length > 0) {
      return {
        success: false,
        error: new Error(`Failed to read files: ${missingFiles.join(", ")}`),
      };
    }

    console.log("✅ Action completed successfully. Please wait...\n\n");
    console.log("-".repeat(50));

    return {
      success: true,
      data: fileContents,
    };
  }

  private convertFileResult(result: IFileOperationResult): IActionResult {
    if (result && result.success) {
      console.log("✅ Action completed successfully. Please wait...\n\n");
    } else {
      console.error("❌ Action failed");
      console.error(
        result && result.error ? result.error.message : "Unknown error",
      );
    }

    console.log("-".repeat(50));

    return {
      success: !!result?.success,
      data: result?.data,
      error: result?.error,
    };
  }
}
