export type ActionType =
  | "read_file"
  | "write_file"
  | "delete_file"
  | "move_file"
  | "copy_file_slice"
  | "execute_command"
  | "search_string"
  | "search_file"
  | "end_task"
  | "fetch_url"
  | "edit_file"
  | "relative_path_lookup";

export interface IActionResult {
  success: boolean;
  data?: any;
  error?: Error;
}

export interface IActionDependency {
  actionId: string;
  type: ActionType;
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
