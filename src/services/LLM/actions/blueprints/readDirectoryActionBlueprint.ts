// readDirectoryActionBlueprint.ts
import { IActionBlueprint } from "../core/IAction";
import { ReadDirectoryAction } from "../ReadDirectoryAction";
import { ActionPriority } from "../types/ActionPriority";

export const readDirectoryActionBlueprint: IActionBlueprint = {
  tag: "read_directory",
  class: ReadDirectoryAction,
  description: "Read all files in a directory",
  usageExplanation: "Use this action to read all files in a directory",
  priority: ActionPriority.CRITICAL,
  canRunInParallel: true,
  requiresProcessing: true,
  parameters: [
    {
      name: "directory",
      required: true,
      description: "The directory path to read",
      validator: (value: any) => typeof value === "string" && value.length > 0,
    },
  ],
};
