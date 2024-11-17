import { exec } from "child_process";
import { autoInjectable } from "tsyringe";
import { promisify } from "util";
import { FileOperations } from "../../FileManagement/FileOperations";
import { FileSearch } from "../../FileManagement/FileSearch";
import { IFileOperationResult } from "../../FileManagement/types/FileManagementTypes";
import { HtmlEntityDecoder } from "../../text/HTMLEntityDecoder";
import { ActionTagsExtractor } from "./ActionTagsExtractor";
import { IActionResult } from "./types/ActionTypes";

const execAsync = promisify(exec);

@autoInjectable()
export class ActionExecutor {
  constructor(
    private fileOperations: FileOperations,
    private fileSearch: FileSearch,
    private actionTagsExtractor: ActionTagsExtractor,
    private htmlEntityDecoder: HtmlEntityDecoder,
  ) {}

  async executeAction(actionText: string): Promise<IActionResult> {
    try {
      const actionMatch = /<(\w+)>([^<]*(?:(?!<\/\1>)<[^<]*)*)<\/\1>/g;
      const matches = Array.from(actionText.matchAll(actionMatch));

      if (!matches.length) {
        return { success: false, error: new Error("Invalid action format") };
      }

      // Execute all actions sequentially
      let lastResult: IActionResult = { success: true };
      for (const match of matches) {
        const [fullMatch, actionType, content] = match;
        lastResult = await this.executeActionByType(actionType, content.trim());

        // Stop execution if an action fails
        if (!lastResult.success) break;
      }

      return lastResult;
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  private async executeActionByType(
    actionType: string,
    content: string,
  ): Promise<IActionResult> {
    switch (actionType) {
      case "read_file":
        console.log("📖 Reading file...");
        return await this.handleReadFile(content);
      case "write_file":
        console.log("📝 Writing to file...");
        return await this.handleWriteFile(
          this.htmlEntityDecoder.decode(content),
        );
      case "delete_file":
        console.log("🗑️  Deleting file...");
        return await this.handleDeleteFile(content);
      case "move_file":
        console.log("🚚 Moving file...");
        return await this.handleMoveFile(content);
      case "copy_file_slice":
        console.log("📋 Copying file...");
        return await this.handleCopyFile(content);
      case "execute_command":
        console.log(`🚀 Executing command: ${content}`);
        return await this.handleExecuteCommand(content);
      case "search_string":
      case "search_file":
        console.log("🔍 Searching...");
        return await this.handleSearch(actionType, content);
      case "end_task":
        console.log("🏁 Ending task...");
        return await this.handleEndTask(content);
      default:
        return {
          success: false,
          error: new Error(`Unknown action type: ${actionType}`),
        };
    }
  }

  private async handleReadFile(content: string): Promise<IActionResult> {
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

    // If only one path, use single file read for backward compatibility
    if (filePaths.length === 1) {
      const result = await this.fileOperations.read(filePaths[0]);
      return this.convertFileResult(result);
    }

    // Multiple paths, use readMultiple
    const result = await this.fileOperations.readMultiple(filePaths);
    if (!result.success) {
      return this.convertFileResult(result);
    }

    // Format multiple file contents for better readability
    const formattedContent = Object.entries(
      result.data as Record<string, string>,
    )
      .map(([path, content]) => `# File: ${path}\n\`\`\`\n${content}\n\`\`\`\n`)
      .join("\n");

    return {
      success: true,
      data: formattedContent,
    };
  }

  private async handleWriteFile(content: string): Promise<IActionResult> {
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

  private async handleDeleteFile(content: string): Promise<IActionResult> {
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

  private async handleMoveFile(content: string): Promise<IActionResult> {
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

  private async handleCopyFile(content: string): Promise<IActionResult> {
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

  private async handleExecuteCommand(command: string): Promise<IActionResult> {
    try {
      const { stdout, stderr } = await execAsync(command);
      return {
        success: !stderr,
        data: stdout,
        error: stderr ? new Error(stderr) : undefined,
      };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  private async handleSearch(
    type: string,
    content: string,
  ): Promise<IActionResult> {
    try {
      const directory = this.actionTagsExtractor.extractTag(
        content,
        "directory",
      );
      const searchTerm = this.actionTagsExtractor.extractTag(content, "term");

      if (!directory || !searchTerm) {
        return {
          success: false,
          error: new Error(
            "Invalid search format. Must include both <directory> and <term> tags.",
          ),
        };
      }

      let results;
      if (type === "search_string") {
        results = await this.fileSearch.findByContent(searchTerm, directory);
      } else {
        // search_file
        results = await this.fileSearch.findByName(searchTerm, directory);
      }

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  private async handleEndTask(content: string): Promise<IActionResult> {
    const message = this.actionTagsExtractor.extractTag(content, "message");
    if (!message) {
      return {
        success: false,
        error: new Error(
          "Invalid end_task format. Must include <message> tag.",
        ),
      };
    }

    console.log(`📝 End task message: ${message}`);
    return {
      success: true,
      data: message,
    };
  }

  private convertFileResult(result: IFileOperationResult): IActionResult {
    if (result.success) {
      console.log("✅ Action completed successfully. Please wait...\n\n");
    } else {
      console.log("❌ Action failed");
    }

    console.log("-".repeat(50));

    return {
      success: result.success,
      data: result.data,
      error: result.error,
    };
  }
}
