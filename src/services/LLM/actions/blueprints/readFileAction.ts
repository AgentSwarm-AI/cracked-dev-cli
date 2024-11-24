import { IActionMetadata } from "../core/IAction";
import { ReadFileAction } from "../ReadFileAction";

export const readFileAction: IActionMetadata = {
  tag: "read_file",
  class: ReadFileAction,
  description: "Reads content from one or more files",
  priority: 0,
  canRunInParallel: true,
  parameters: [
    {
      name: "path",
      required: true,
      description:
        "The path(s) of the file(s) to read. Can specify multiple path tags.",
      validator: (value: any) => typeof value === "string" && value.length > 0,
    },
  ],
};
