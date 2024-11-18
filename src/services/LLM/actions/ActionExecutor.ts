import { autoInjectable } from "tsyringe";
import { CommandAction } from "./CommandAction";
import { EndTaskAction } from "./EndTaskAction";
import { FileActions } from "./FileActions";
import { SearchAction } from "./SearchAction";
import { IActionResult } from "./types/ActionTypes";

@autoInjectable()
export class ActionExecutor {
  constructor(
    private fileActions: FileActions,
    private commandAction: CommandAction,
    private searchAction: SearchAction,
    private endTaskAction: EndTaskAction,
  ) {}

  async executeAction(actionText: string): Promise<IActionResult> {
    try {
      // Updated regex to better handle nested tags
      const actionMatch = /<(\w+)>([\s\S]*?)<\/\1>/g;
      const matches = Array.from(actionText.matchAll(actionMatch));

      if (!matches.length) {
        return { success: false, error: new Error("Invalid action format") };
      }

      // Execute all actions sequentially
      let lastResult: IActionResult = { success: true };
      for (const match of matches) {
        const [fullMatch, actionType, content] = match;
        // Skip nested tags that are part of the content
        if (actionType === "path" || actionType === "content") continue;

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
        return await this.fileActions.handleReadFile(content);
      case "write_file":
        console.log("📝 Writing to file...");
        return await this.fileActions.handleWriteFile(content);
      case "delete_file":
        console.log("🗑️ Deleting file...");
        return await this.fileActions.handleDeleteFile(content);
      case "move_file":
        console.log("🚚 Moving file...");
        return await this.fileActions.handleMoveFile(content);
      case "copy_file_slice":
        console.log("📋 Copying file...");
        return await this.fileActions.handleCopyFile(content);
      case "execute_command":
        console.log(`🚀 Executing command: ${content}`);
        return await this.commandAction.execute(content);
      case "search_string":
      case "search_file":
        console.log("🔍 Searching...");
        return await this.searchAction.execute(actionType, content);
      case "end_task":
        console.log("🏁 Ending task...");
        return await this.endTaskAction.execute(content);
      default:
        return {
          success: false,
          error: new Error(`Unknown action type: ${actionType}`),
        };
    }
  }
}
