import { IActionMetadata } from "../core/IAction";
import { MoveFileAction } from "../MoveFileAction";

export const moveFileAction: IActionMetadata = {
  tag: "move_file",
  class: MoveFileAction,
  description: "Move a file from source to destination path",
  priority: 2, // Higher priority since it's a file operation
  canRunInParallel: false,
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
