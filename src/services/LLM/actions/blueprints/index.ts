import { IActionMetadata } from "../core/IAction";
import { commandAction } from "./commandAction";
import { copyFileAction } from "./copyFileAction";
import { deleteFileAction } from "./deleteFileAction";
import { endTaskAction } from "./endTaskAction";
import { fetchUrlAction } from "./fetchUrlAction";
import { moveFileAction } from "./moveFileAction";
import { readFileAction } from "./readFileAction";
import { relativePathLookupAction } from "./relativePathLookupAction";
import { searchFileAction, searchStringAction } from "./searchActions";
import { writeFileAction } from "./writeFileAction";

export const actionsBlueprints = {
  write_file: writeFileAction,
  read_file: readFileAction,
  execute_command: commandAction,
  search_string: searchStringAction,
  search_file: searchFileAction,
  end_task: endTaskAction,
  relative_path_lookup: relativePathLookupAction,
  delete_file: deleteFileAction,
  move_file: moveFileAction,
  fetch_url: fetchUrlAction,
  copy_file: copyFileAction,
} as const;

// Infer action types from blueprints
export type ActionTag = keyof typeof actionsBlueprints;

// Helper to get blueprint by tag
export function getBlueprint(tag: ActionTag): IActionMetadata {
  return actionsBlueprints[tag];
}

// Helper to get all registered action tags
export function getActionTags(): ActionTag[] {
  return Object.keys(actionsBlueprints) as ActionTag[];
}

// Helper to check if an action is fully implemented
export function isActionImplemented(tag: ActionTag): boolean {
  const blueprint = actionsBlueprints[tag];
  return !!(blueprint && blueprint.class && blueprint.tag);
}

// Get only implemented actions
export function getImplementedActions(): ActionTag[] {
  return getActionTags().filter(isActionImplemented);
}
