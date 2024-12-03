import { IActionBlueprint } from "../core/IAction";
import { ReadFileAction } from "../ReadFileAction";
import { ActionPriority } from "../types/ActionPriority";

export const readFileActionBlueprint: IActionBlueprint = {
  tag: "read_file",
  class: ReadFileAction,
  description: "Reads content from one or more files",
  priority: ActionPriority.CRITICAL,
  canRunInParallel: true,
  requiresProcessing: true,
  parameters: [
    {
      name: "path",
      required: true,
      description:
        "The path(s) of the file(s) to read. Can specify multiple path tags.",
      validator: (value: unknown): value is string =>
        typeof value === "string" && value.length > 0,
    },
  ],
};
