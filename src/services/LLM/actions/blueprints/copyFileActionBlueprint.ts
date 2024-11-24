import { CopyFileAction } from "../CopyFileAction";
import { IActionBlueprint } from "../core/IAction";

export const copyFileActionBlueprint: IActionBlueprint = {
  tag: "copy_file",
  class: CopyFileAction,
  description: "Copy a file from source to destination path",
  priority: 1,
  canRunInParallel: true,
  parameters: [
    {
      name: "source_path",
      required: true,
      description: "The source path of the file to copy",
      validator: (value: any) => typeof value === "string" && value.length > 0,
    },
    {
      name: "destination_path",
      required: true,
      description: "The destination path for the file copy",
      validator: (value: any) => typeof value === "string" && value.length > 0,
    },
  ],
};
