import { IActionMetadata } from "../core/IAction";
import { WriteFileAction } from "../WriteFileAction";

export const writeFileAction: IActionMetadata = {
  tag: "write_file",
  class: WriteFileAction,
  description:
    "Writes content to a file with safety checks for content removal",
  priority: 1,
  canRunInParallel: false,
  parameters: [
    {
      name: "path",
      required: true,
      description: "The path where the file will be written",
      validator: (value: any) => typeof value === "string" && value.length > 0,
    },
    {
      name: "content",
      required: true,
      description:
        "The content to write to the file. Must not remove too much existing content if file exists.",
      validator: (value: any) => typeof value === "string",
    },
  ],
};
