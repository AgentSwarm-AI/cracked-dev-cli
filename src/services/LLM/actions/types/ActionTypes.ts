import { ActionTag } from "../blueprints";
import { CommandError } from "../errors/CommandError";

export type ValidatorFn = (
  value: string | number | boolean | unknown,
) => boolean;

export interface WriteActionData {
  selectedModel?: string;
  regenerate?: boolean;
  [key: string]: unknown;
}

export interface IActionResult {
  success: boolean;
  data?: WriteActionData | unknown;
  error?: Error | CommandError;
  processedResults?: Map<string, unknown>;
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
