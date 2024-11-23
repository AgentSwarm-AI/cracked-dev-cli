import { FileOperations } from "@services/FileManagement/FileOperations";
import { FileSearch } from "@services/FileManagement/FileSearch";
import { IFileOperationResult } from "@services/FileManagement/types/FileManagementTypes";
import { ActionTagsExtractor } from "@services/LLM/actions/ActionTagsExtractor";
import { IActionResult } from "@services/LLM/actions/types/ActionTypes";
import { DebugLogger } from "@services/logging/DebugLogger";
import path from "path";
import { autoInjectable } from "tsyringe";

@autoInjectable()
export class ReadFileAction {
  constructor(
    private fileOperations: FileOperations,
    private actionTagsExtractor: ActionTagsExtractor,
    private debugLogger: DebugLogger,
    private fileSearch: FileSearch,
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
      const exists = await this.fileOperations.exists(filePaths[0]);
      if (!exists) {
        const fileName = path.basename(filePaths[0]);
        const searchResults = await this.fileSearch.findByName(
          fileName,
          process.cwd(),
        );

        if (searchResults.length > 0) {
          console.log(
            `🔍 File not found at specified path. Found alternative(s): ${searchResults.join(", ")}`,
          );
          const result = await this.fileOperations.read(searchResults[0]);
          return this.convertFileResult(result);
        }
      }
      const result = await this.fileOperations.read(filePaths[0]);
      return this.convertFileResult(result);
    }

    // Multiple paths, handle each file individually first
    const resolvedPaths = [];
    for (const filePath of filePaths) {
      const exists = await this.fileOperations.exists(filePath);
      if (!exists) {
        const fileName = path.basename(filePath);
        const searchResults = await this.fileSearch.findByName(
          fileName,
          process.cwd(),
        );
        if (searchResults.length > 0) {
          console.log(
            `🔍 File not found at ${filePath}. Found at: ${searchResults[0]}`,
          );
          resolvedPaths.push(searchResults[0]);
        } else {
          resolvedPaths.push(filePath);
        }
      } else {
        resolvedPaths.push(filePath);
      }
    }

    const result = await this.fileOperations.readMultiple(resolvedPaths);

    this.debugLogger.log("ReadFileAction", "execute", result);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || new Error("Failed to read multiple files"),
      };
    }

    const fileContent = result.data.toString();

    // Verify all requested files are present in the result
    const missingFiles = resolvedPaths.filter(
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
