import { IActionBlueprint } from "../core/IAction";
import { RelativePathLookupAction } from "../RelativePathLookupAction";

export const relativePathLookupActionBlueprint: IActionBlueprint = {
  tag: "relative_path_lookup",
  class: RelativePathLookupAction,
  description: "Adjust and validate relative file paths",
  priority: 0,
  canRunInParallel: true,
  parameters: [
    {
      name: "source_path",
      required: true,
      description: "The source file path to resolve relative paths from",
      validator: (value: any) => typeof value === "string" && value.length > 0,
    },
    {
      name: "path",
      required: true,
      description: "The relative path to adjust",
      validator: (value: any) => typeof value === "string" && value.length > 0,
    },
    {
      name: "threshold",
      required: false,
      description: "Similarity threshold for path matching (default: 0.6)",
      validator: (value: any) =>
        !value || (typeof value === "number" && value > 0 && value <= 1),
    },
  ],
};
