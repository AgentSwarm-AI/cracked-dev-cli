import { IActionBlueprint } from "../core/IAction";
import { MoveFileAction } from "../MoveFileAction";
import { ActionPriority } from "../types/ActionPriority";

export const moveFileActionBlueprint: IActionBlueprint = {
  tag: "move_file",
  class: MoveFileAction,
  description: "Move a file from source to destination path",
  priority: ActionPriority.MEDIUM,
  canRunInParallel: false,
  requiresProcessing: false,
  parameters: [
    {
      name: "source_path",
      required: true,
      description: "The source path of the file to move",
      validator: (value: any) => typeof value === "string" && value.length > 0,
    },
    {
      name: "destination_path",
      required: true,
      description: "The destination path for the file",
      validator: (value: any) => typeof value === "string" && value.length > 0,
    },
  ],
};
