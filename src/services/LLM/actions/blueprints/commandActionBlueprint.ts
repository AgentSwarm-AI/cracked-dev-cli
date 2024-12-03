import { CommandAction } from "../CommandAction";
import { IActionBlueprint } from "../core/IAction";
import { ActionPriority } from "../types/ActionPriority";

export const commandActionBlueprint: IActionBlueprint = {
  tag: "execute_command",
  class: CommandAction,
  description: "Executes a system command with output streaming",
  priority: ActionPriority.LOW,
  canRunInParallel: false,
  requiresProcessing: true,
  parameters: [], // No parameters since we extract command from tag content
};
