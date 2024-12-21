import { IActionBlueprint } from "../core/IAction";

// Import all blueprints
import { actionExplainerBlueprint } from "./actionExplainerBlueprint";
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
import { listDirectoryFilesActionBlueprint } from "./listDirectoryFilesActionBlueprint";
import {
  searchFileActionBlueprint,
  searchStringActionBlueprint,
} from "./searchActionsBlueprint";
import { writeFileActionBlueprint } from "./writeFileActionBlueprint";

// Create a map of all blueprints
export const actionsBlueprints = {
  [actionExplainerBlueprint.tag]: actionExplainerBlueprint,
  [commandActionBlueprint.tag]: commandActionBlueprint,
  [copyFileActionBlueprint.tag]: copyFileActionBlueprint,
  [deleteFileActionBlueprint.tag]: deleteFileActionBlueprint,
  [endPhaseActionBlueprint.tag]: endPhaseActionBlueprint,
  [endTaskActionBlueprint.tag]: endTaskActionBlueprint,
  [fetchUrlActionBlueprint.tag]: fetchUrlActionBlueprint,
  [gitDiffActionBlueprint.tag]: gitDiffActionBlueprint,
  [gitPRDiffActionBlueprint.tag]: gitPRDiffActionBlueprint,
  [moveFileActionBlueprint.tag]: moveFileActionBlueprint,
  [readFileActionBlueprint.tag]: readFileActionBlueprint,
  [relativePathLookupActionBlueprint.tag]: relativePathLookupActionBlueprint,
  [searchFileActionBlueprint.tag]: searchFileActionBlueprint,
  [searchStringActionBlueprint.tag]: searchStringActionBlueprint,
  [writeFileActionBlueprint.tag]: writeFileActionBlueprint,
  [listDirectoryFilesActionBlueprint.tag]: listDirectoryFilesActionBlueprint,
} as const;

// Type for action tags based on the blueprint map
export type ActionTag = keyof typeof actionsBlueprints & string;

// Helper functions
export function getBlueprint(tag: ActionTag): IActionBlueprint {
  return actionsBlueprints[tag];
}

export function getActionTags(): ActionTag[] {
  return Object.keys(actionsBlueprints) as ActionTag[];
}

export function getImplementedActions(): ActionTag[] {
  return getActionTags().filter((tag) => {
    const blueprint = actionsBlueprints[tag];
    return !!(blueprint && blueprint.class && blueprint.tag);
  });
}
