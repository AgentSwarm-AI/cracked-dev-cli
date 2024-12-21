import { IActionBlueprint } from "../core/IAction";
import { RelativePathLookupAction } from "../RelativePathLookupAction";
import { ActionPriority } from "../types/ActionPriority";

export const relativePathLookupActionBlueprint: IActionBlueprint = {
  tag: "relative_path_lookup",
  class: RelativePathLookupAction,
  description: "Adjust and validate relative file paths",
  usageExplanation: `The relative_path_lookup action helps resolve and validate relative paths. Here are common use cases:

1. Find correct import path:
<relative_path_lookup>
  <source_path>src/services/MyService.ts</source_path>
  <path>../utils/helper</path>
</relative_path_lookup>

2. Validate path with custom threshold:
<relative_path_lookup>
  <source_path>src/services/MyService.ts</source_path>
  <path>../types/interfaces</path>
  <threshold>0.8</threshold>
</relative_path_lookup>

Note:
- source_path is where you're importing from
- path is what you want to import
- threshold controls fuzzy matching (0.0-1.0)
- Higher threshold = stricter matching
- Default threshold is 0.6`,
  priority: ActionPriority.HIGH,
  canRunInParallel: true,
  requiresProcessing: true,
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
