import { autoInjectable } from "tsyringe";
import { CommandAction } from "./CommandAction";
import { EndTaskAction } from "./EndTaskAction";
import { FileActions } from "./FileActions";
import { RelativePathLookupAction } from "./RelativePathLookupAction";
import { SearchAction } from "./SearchAction";
import { IActionResult } from "./types/ActionTypes";
import { WriteFileAction } from "./WriteFileAction";

interface IPendingAction {
  type: string;
  content: string;
  priority: number;
  rawContent: string;
}

@autoInjectable()
export class ActionExecutor {
  constructor(
    private fileActions: FileActions,
    private commandAction: CommandAction,
    private searchAction: SearchAction,
    private endTaskAction: EndTaskAction,
    private writeFileAction: WriteFileAction,
    private relativePathLookupAction: RelativePathLookupAction,
  ) {}

  async executeAction(actionText: string): Promise<IActionResult> {
    try {
      // Check for action words without proper XML structure
      const actionWords = [
        "write_file",
        "read_file",
        "delete_file",
        "move_file",
        "copy_file_slice",
        "fetch_url",
        "execute_command",
        "search_string",
        "search_file",
        "end_task",
        "relative_path_lookup",
      ];

      for (const word of actionWords) {
        if (
          actionText.includes(word) &&
          !actionText.includes(`<${word}>`) &&
          !actionText.includes(`</${word}>`)
        ) {
          return {
            success: false,
            error: new Error(
              `Found "${word}" without proper XML tag structure. Tags must be wrapped in < > brackets. For example: <${word}>content</${word}>`,
            ),
          };
        }
      }

      // Updated regex to better handle nested tags
      const actionMatch = /<(\w+)>([\s\S]*?)<\/\1>/g;
      const matches = Array.from(actionText.matchAll(actionMatch));

      if (!matches.length) {
        return {
          success: false,
          error: new Error(
            "No valid action tags found. Actions must be wrapped in XML-style tags.",
          ),
        };
      }

      // Collect and sort actions
      const pendingActions: IPendingAction[] = matches
        .filter(
          ([, actionType]) => actionType !== "path" && actionType !== "content",
        )
        .map(([fullMatch, actionType, content]) => ({
          type: actionType,
          content: content.trim(),
          rawContent: fullMatch,
          // execute_command gets lowest priority (runs last)
          priority: actionType === "execute_command" ? 1 : 0,
        }))
        .sort((a, b) => a.priority - b.priority);

      // Execute actions in order
      let lastResult: IActionResult = { success: true };
      for (const action of pendingActions) {
        lastResult = await this.executeActionByType(
          action.type,
          action.type === "relative_path_lookup"
            ? action.rawContent
            : action.content,
        );
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
        return await this.writeFileAction.execute(content);
      case "delete_file":
        console.log("🗑️ Deleting file...");
        return await this.fileActions.handleDeleteFile(content);
      case "move_file":
        console.log("🚚 Moving file...");
        return await this.fileActions.handleMoveFile(content);
      case "copy_file_slice":
        console.log("📋 Copying file...");
        return await this.fileActions.handleCopyFile(content);
      case "fetch_url":
        console.log("🌐 Fetching URL...");
        return await this.fileActions.handleFetchUrl(content);
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
      case "relative_path_lookup":
        console.log("🔄 Looking up relative path...");
        return await this.relativePathLookupAction.execute(content);
      default:
        return {
          success: false,
          error: new Error(`Unknown action type: ${actionType}`),
        };
    }
  }
}
