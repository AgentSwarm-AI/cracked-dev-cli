import { IActionBlueprint } from "../core/IAction";
import { DeleteFileAction } from "../DeleteFileAction";

export const deleteFileActionBlueprint: IActionBlueprint = {
  tag: "delete_file",
  class: DeleteFileAction,
  description: "Delete a file at the specified path",
  priority: 2, // Higher priority since it's a destructive operation
  canRunInParallel: false,
  parameters: [
    {
      name: "path",
      required: true,
      description: "The path of the file to delete",
      validator: (value: any) => typeof value === "string" && value.length > 0,
    },
  ],
};
