import { IActionBlueprint } from "../core/IAction";
import { ActionPriority } from "../types/ActionPriority";
import { WriteFileAction } from "../WriteFileAction";

export const writeFileActionBlueprint: IActionBlueprint = {
  tag: "write_file",
  class: WriteFileAction,
  description:
    "Writes content to a file with safety checks for content removal",
  priority: ActionPriority.MEDIUM,
  canRunInParallel: false,
  requiresProcessing: false,
  parameters: [
    {
      name: "type",
      required: true,
      description:
        "Specifies whether this is a new file creation or an update to an existing file",
      validator: (value: unknown): value is string =>
        typeof value === "string" &&
        ["new", "update"].includes(value as string),
    },
    {
      name: "path",
      required: true,
      description: "The path where the file will be written",
      validator: (value: unknown): value is string =>
        typeof value === "string" && value.length > 0,
    },
    {
      name: "content",
      required: true,
      description:
        "The content to write to the file. Must not remove too much existing content if file exists.",
      validator: (value: unknown): value is string => typeof value === "string",
    },
  ],
};
