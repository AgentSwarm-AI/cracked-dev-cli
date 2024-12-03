import { IActionBlueprint } from "../core/IAction";
import { DeleteFileAction } from "../DeleteFileAction";
import { ActionPriority } from "../types/ActionPriority";

export const deleteFileActionBlueprint: IActionBlueprint = {
  tag: "delete_file",
  class: DeleteFileAction,
  description: "Delete a file at the specified path",
  priority: ActionPriority.MEDIUM,
  canRunInParallel: false,
  requiresProcessing: false,
  parameters: [
    {
      name: "path",
      required: true,
      description: "The path of the file to delete",
      validator: (value: any) => typeof value === "string" && value.length > 0,
    },
  ],
};
