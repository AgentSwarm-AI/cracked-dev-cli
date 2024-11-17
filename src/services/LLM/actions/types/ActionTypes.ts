export interface IActionResult {
  success: boolean;
  data?: any;
  error?: Error;
}

export type ActionType =
  | "read_file"
  | "write_file"
  | "delete_file"
  | "move_file"
  | "copy_file_slice"
  | "execute_command"
  | "search_string"
  | "search_file"
  | "end_task";

export interface IActionDependency {
  actionId: string;
  type: ActionType;
  content: string;
  dependsOn?: string[]; // Array of action IDs this action depends on
}

export interface IActionGroup {
  actions: IActionDependency[];
  parallel: boolean; // Whether actions in this group can be executed in parallel
}

export interface IActionExecutionPlan {
  groups: IActionGroup[]; // Groups of actions to be executed in sequence
}
