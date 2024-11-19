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
        error: new Error(
          `Failed to read files: ${invalidPaths.join(", ")} - Try using a <search_file> to find the correct file path.`,
        ),
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

    const fileContent = result.data.toString();

    // Verify all requested files are present in the result
    const missingFiles = filePaths.filter(
      (path) => !fileContent.includes(`[File: ${path}]`),
    );
    if (missingFiles.length > 0) {
      return {
        success: false,
        error: new Error(
          `Failed to read files: ${missingFiles.join(", ")}. Try using search_file action to find the proper path.`,
        ),
      };
    }

    console.log("✅ Action completed successfully. Please wait...\n\n");
    console.log("-".repeat(50));

    return {
      success: true,
      data: fileContent,
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
