import { CommandAction } from "../CommandAction";
import { IActionMetadata } from "../core/IAction";

export const commandAction: IActionMetadata = {
  tag: "execute_command",
  class: CommandAction,
  description: "Executes a system command with output streaming",
  priority: 3, // Lower priority to run after file operations
  canRunInParallel: false,
  parameters: [], // No parameters since we extract command from tag content
};
