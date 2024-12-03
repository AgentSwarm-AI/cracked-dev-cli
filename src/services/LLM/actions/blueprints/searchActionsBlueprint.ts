import { IActionBlueprint } from "../core/IAction";
import { SearchAction } from "../SearchAction";
import { ActionPriority } from "../types/ActionPriority";

export const searchStringActionBlueprint: IActionBlueprint = {
  tag: "search_string",
  class: SearchAction,
  description: "Search for content within files",
  priority: ActionPriority.HIGH,
  canRunInParallel: true,
  requiresProcessing: true,
  parameters: [
    {
      name: "directory",
      required: true,
      description: "The directory to search in",
      validator: (value: any) => typeof value === "string" && value.length > 0,
    },
    {
      name: "term",
      required: true,
      description: "The content to search for",
      validator: (value: any) => typeof value === "string" && value.length > 0,
    },
  ],
};

export const searchFileActionBlueprint: IActionBlueprint = {
  tag: "search_file",
  class: SearchAction,
  description: "Search for files by name",
  priority: ActionPriority.HIGH,
  canRunInParallel: true,
  requiresProcessing: true,
  parameters: [
    {
      name: "directory",
      required: true,
      description: "The directory to search in",
      validator: (value: any) => typeof value === "string" && value.length > 0,
    },
    {
      name: "term",
      required: true,
      description: "The filename pattern to search for",
      validator: (value: any) => typeof value === "string" && value.length > 0,
    },
  ],
};
