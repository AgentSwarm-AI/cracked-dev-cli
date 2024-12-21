import { IActionBlueprint } from "../core/IAction";
import { ListDirectoryFilesAction } from "../ListDirectoryFilesAction";
import { ActionPriority } from "../types/ActionPriority";

export const listDirectoryFilesActionBlueprint: IActionBlueprint = {
  tag: "list_directory_files",
  class: ListDirectoryFilesAction,
  description: "Lists all file paths inside a directory",
  priority: ActionPriority.HIGH,
  canRunInParallel: true,
  requiresProcessing: false,
  parameters: [
    {
      name: "path",
      required: true,
      description: "The directory path to list files from",
      validator: (value: unknown): value is string =>
        typeof value === "string" && value.length > 0,
    },
    {
      name: "recursive",
      required: false,
      description: "Whether to list files recursively (default: false)",
      validator: (value: unknown): value is boolean =>
        typeof value === "boolean",
    },
  ],
};
