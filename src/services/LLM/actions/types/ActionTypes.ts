import { ActionTag } from "../blueprints";
import { CommandError } from "../errors/CommandError";

export interface IActionResult {
  success: boolean;
  data?: any;
  error?: Error | CommandError;
}

export interface IActionDependency {
  actionId: string;
  type: ActionTag;
  content: string;
  dependsOn?: string[];
}

export interface IActionGroup {
  actions: IActionDependency[];
  parallel: boolean;
}

export interface IActionExecutionPlan {
  groups: IActionGroup[];
}
