import { exec } from "child_process";
import { autoInjectable } from "tsyringe";
import { promisify } from "util";
import { FileOperations } from "../FileManagement/FileOperations";
import { IFileOperationResult } from "../FileManagement/types/FileManagementTypes";

const execAsync = promisify(exec);

interface IActionResult {
  success: boolean;
  data?: any;
  error?: Error;
}

@autoInjectable()
export class ActionExecutor {
  constructor(private fileOperations: FileOperations) {}

  async executeAction(actionText: string): Promise<IActionResult> {
    try {
      const actionMatch = /<(\w+)>([\s\S]*?)<\/\1>/;
      const match = actionText.match(actionMatch);

      if (!match) {
        return { success: false, error: new Error("Invalid action format") };
      }

      const [_, actionType, content] = match;

      switch (actionType) {
        case "read_file":
          console.log("📖 Reading file...");
          return await this.handleReadFile(content.trim());
        case "write_file":
          console.log("📝 Writing to file...");
          return await this.handleWriteFile(content);
        case "delete_file":
          console.log("🗑️  Deleting file...");
          return await this.handleDeleteFile(content.trim());
        case "move_file":
          console.log("🚚 Moving file...");
          return await this.handleMoveFile(content);
        case "copy_file_slice":
          console.log("📋 Copying file...");
          return await this.handleCopyFile(content);
        case "execute_command":
          console.log("🚀 Executing command...");
          return await this.handleExecuteCommand(content.trim());
        case "search_string":
        case "search_file":
          console.log("🔍 Searching...");
          return await this.handleSearch(actionType, content.trim());
        case "edit_code_file":
          console.log("✏️  Editing code...");
          return await this.handleEditCode(content);
        default:
          return {
            success: false,
            error: new Error(`Unknown action type: ${actionType}`),
          };
      }
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  private async handleReadFile(filePath: string): Promise<IActionResult> {
    console.log(`📁 File path: ${filePath}`);
    const result = await this.fileOperations.read(filePath);
    return this.convertFileResult(result);
  }

  private async handleWriteFile(content: string): Promise<IActionResult> {
    const pathMatch = /<path>(.*?)<\/path>/;
    const contentMatch = /<content>([\s\S]*?)<\/content>/;

    const path = content.match(pathMatch)?.[1];
    const fileContent = content.match(contentMatch)?.[1];

    if (!path || !fileContent) {
      return { success: false, error: new Error("Invalid write_file format") };
    }

    console.log(`📁 File path: ${path}`);
    const result = await this.fileOperations.write(path, fileContent);
    return this.convertFileResult(result);
  }

  private async handleDeleteFile(filePath: string): Promise<IActionResult> {
    console.log(`📁 File path: ${filePath}`);
    const result = await this.fileOperations.delete(filePath);
    return this.convertFileResult(result);
  }

  private async handleMoveFile(content: string): Promise<IActionResult> {
    const [source, destination] = content
      .split("\n")
      .map((line) => line.trim());
    if (!source || !destination) {
      return { success: false, error: new Error("Invalid move_file format") };
    }

    console.log(`📁 Source path: ${source}`);
    console.log(`📁 Destination path: ${destination}`);
    const result = await this.fileOperations.move(source, destination);
    return this.convertFileResult(result);
  }

  private async handleCopyFile(content: string): Promise<IActionResult> {
    const [source, destination] = content
      .split("\n")
      .map((line) => line.trim());
    if (!source || !destination) {
      return { success: false, error: new Error("Invalid copy_file format") };
    }

    console.log(`📁 Source path: ${source}`);
    console.log(`📁 Destination path: ${destination}`);
    const result = await this.fileOperations.copy(source, destination);
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
    // Implement search functionality
    return {
      success: false,
      error: new Error("Search functionality not implemented yet"),
    };
  }

  private async handleEditCode(content: string): Promise<IActionResult> {
    const edits = content
      .split("###")
      .map((edit) => edit.trim())
      .filter(Boolean);
    const results: IActionResult[] = [];

    for (const edit of edits) {
      const filePathMatch = /<file_path>(.*?)<\/file_path>/;
      const rangeMatch = /<range>(.*?)<\/range>/;
      const replaceWithMatch = /<replace_with>([\s\S]*?)<\/replace_with>/;

      const filePath = edit.match(filePathMatch)?.[1];
      const range = edit.match(rangeMatch)?.[1];
      const replaceWith = edit.match(replaceWithMatch)?.[1];

      if (!filePath || !range || !replaceWith) {
        results.push({
          success: false,
          error: new Error("Invalid edit_code_file format"),
        });
        continue;
      }

      console.log(`📁 File path: ${filePath}`);
      const [start, end] = range.split("-").map(Number);
      const fileResult = await this.fileOperations.read(filePath);

      if (!fileResult.success || typeof fileResult.data !== "string") {
        results.push({
          success: false,
          error: new Error(`Failed to read file: ${filePath}`),
        });
        continue;
      }

      const lines = fileResult.data.split("\n");
      lines.splice(start - 1, end - start + 1, replaceWith);

      const writeResult = await this.fileOperations.write(
        filePath,
        lines.join("\n"),
      );
      results.push(this.convertFileResult(writeResult));
    }

    return {
      success: results.every((r) => r.success),
      data: results,
      error: results.find((r) => !r.success)?.error,
    };
  }

  private convertFileResult(result: IFileOperationResult): IActionResult {
    if (result.success) {
      console.log("✅ Action completed successfully");
    } else {
      console.log("❌ Action failed");
    }
    return {
      success: result.success,
      data: result.data,
      error: result.error,
    };
  }
}
