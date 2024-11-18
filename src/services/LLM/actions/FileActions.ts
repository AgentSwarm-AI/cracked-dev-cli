import { autoInjectable } from "tsyringe";

import { fetch_url } from "../../FileManagement/FetchUtil";
import { FileOperations } from "../../FileManagement/FileOperations";
import { IFileOperationResult } from "../../FileManagement/types/FileManagementTypes";
import { ActionTagsExtractor } from "./ActionTagsExtractor";
import { IActionResult } from "./types/ActionTypes";

@autoInjectable()
export class FileActions {
  constructor(
    private fileOperations: FileOperations,
    private actionTagsExtractor: ActionTagsExtractor,
  ) {}

  private convertFileResult(result: IFileOperationResult): IActionResult {
    if (result.success) {
      console.log("✅ Action completed successfully. Please wait...\n\n");
    } else {
      console.error("❌ Action failed");
      console.error(result?.error ? result.error.message : "Unknown error");
    }

    console.log("-".repeat(50));

    return {
      success: result.success,
      data: result.data,
      error: result.error,
    };
  }

  async handleReadFile(content: string): Promise<IActionResult> {
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

    if (filePaths.length === 1) {
      const result = await this.fileOperations.read(filePaths[0]);
      return this.convertFileResult(result);
    }

    const result = await this.fileOperations.readMultiple(filePaths);
    return this.convertFileResult(result);
  }

  async handleWriteFile(content: string): Promise<IActionResult> {
    const filePath = this.actionTagsExtractor.extractTag(content, "path");
    const fileContent = this.actionTagsExtractor.extractTag(content, "content");

    if (!filePath || !fileContent) {
      return {
        success: false,
        error: new Error(
          "Invalid write_file format. Must include both <path> and <content> tags.",
        ),
      };
    }

    console.log(`📁 File path: ${filePath}`);
    const result = await this.fileOperations.write(filePath, fileContent);
    return this.convertFileResult(result);
  }

  async handleDeleteFile(content: string): Promise<IActionResult> {
    const filePath = this.actionTagsExtractor.extractTag(content, "path");
    if (!filePath) {
      return {
        success: false,
        error: new Error(
          "Invalid delete_file format. Must include <path> tag.",
        ),
      };
    }

    console.log(`📁 File path: ${filePath}`);
    const result = await this.fileOperations.delete(filePath);
    return this.convertFileResult(result);
  }

  async handleMoveFile(content: string): Promise<IActionResult> {
    const sourcePath = this.actionTagsExtractor.extractTag(
      content,
      "source_path",
    );
    const destinationPath = this.actionTagsExtractor.extractTag(
      content,
      "destination_path",
    );

    if (!sourcePath || !destinationPath) {
      return {
        success: false,
        error: new Error(
          "Invalid move_file format. Must include both <source_path> and <destination_path> tags.",
        ),
      };
    }

    console.log(`📁 Source path: ${sourcePath}`);
    console.log(`📁 Destination path: ${destinationPath}`);
    const result = await this.fileOperations.move(sourcePath, destinationPath);
    return this.convertFileResult(result);
  }

  async handleCopyFile(content: string): Promise<IActionResult> {
    const sourcePath = this.actionTagsExtractor.extractTag(
      content,
      "source_path",
    );
    const destinationPath = this.actionTagsExtractor.extractTag(
      content,
      "destination_path",
    );

    if (!sourcePath || !destinationPath) {
      return {
        success: false,
        error: new Error(
          "Invalid copy_file format. Must include both <source_path> and <destination_path> tags.",
        ),
      };
    }

    console.log(`📁 Source path: ${sourcePath}`);
    console.log(`📁 Destination path: ${destinationPath}`);
    const result = await this.fileOperations.copy(sourcePath, destinationPath);
    return this.convertFileResult(result);
  }

  async handleFetchUrl(content: string): Promise<IActionResult> {
    const url = this.actionTagsExtractor.extractTag(content, "url");
    if (!url) {
      return {
        success: false,
        error: new Error("Invalid fetch_url format. Must include <url> tag."),
      };
    }

    console.log(`🌐 URL: ${url}`);

    try {
      const data = await fetch_url(url);
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error : new Error("Failed to fetch URL"),
      };
    }
  }
}
