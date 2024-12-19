import { IActionBlueprint } from "../core/IAction";
import { commandActionBlueprint } from "./commandActionBlueprint";
import { copyFileActionBlueprint } from "./copyFileActionBlueprint";
import { deleteFileActionBlueprint } from "./deleteFileActionBlueprint";
import { endPhaseActionBlueprint } from "./endPhaseActionBlueprint";
import { endTaskActionBlueprint } from "./endTaskActionBlueprint";
import { fetchUrlActionBlueprint } from "./fetchUrlActionBlueprint";
import { gitDiffActionBlueprint } from "./gitDiffActionBlueprint";
import { gitPRDiffActionBlueprint } from "./gitPRDiffActionBlueprint";
import { moveFileActionBlueprint } from "./moveFileActionBlueprint";
import { readFileActionBlueprint } from "./readFileActionBlueprint";
import { relativePathLookupActionBlueprint } from "./relativePathLookupActionBlueprint";
import {
  searchFileActionBlueprint,
  searchStringActionBlueprint,
} from "./searchActionsBlueprint";
import { writeFileActionBlueprint } from "./writeFileActionBlueprint";

export const actionsBlueprints = {
  write_file: writeFileActionBlueprint,
  read_file: readFileActionBlueprint,
  execute_command: commandActionBlueprint,
  search_string: searchStringActionBlueprint,
  search_file: searchFileActionBlueprint,
  end_task: endTaskActionBlueprint,
  end_phase: endPhaseActionBlueprint,
  relative_path_lookup: relativePathLookupActionBlueprint,
  delete_file: deleteFileActionBlueprint,
  move_file: moveFileActionBlueprint,
  fetch_url: fetchUrlActionBlueprint,
  copy_file: copyFileActionBlueprint,
  git_diff: gitDiffActionBlueprint,
  git_pr_diff: gitPRDiffActionBlueprint,
} as const;

// Infer action types from blueprints
export type ActionTag = keyof typeof actionsBlueprints;

// Helper to get blueprint by tag
export function getBlueprint(tag: ActionTag): IActionBlueprint {
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
