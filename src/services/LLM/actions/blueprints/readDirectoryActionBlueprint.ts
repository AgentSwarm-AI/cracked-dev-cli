// readDirectoryActionBlueprint.ts
import { IActionBlueprint } from "../core/IAction";
import { ReadDirectoryAction } from "../ReadDirectoryAction";
import { ActionPriority } from "../types/ActionPriority";

export const readDirectoryActionBlueprint: IActionBlueprint = {
  tag: "read_directory",
  class: ReadDirectoryAction,
  description: "Read all files in one or more directories",
  usageExplanation: `The read_directory action allows you to read all files in one or more directories. Here are common use cases:

1. Read a single directory:
<read_directory>
  <path>src/services</path>
</read_directory>

2. Read multiple directories at once:
<read_directory>
  <path>src/services</path>
  <path>src/types</path>
</read_directory>

Note:
- Use relative paths from the workspace root
- You can read multiple directories at once
- Each directory will be scanned recursively
- Files that fail to read will be skipped`,
  priority: ActionPriority.CRITICAL,
  canRunInParallel: true,
  requiresProcessing: true,
  parameters: [
    {
      name: "path",
      required: true,
      description:
        "The directory path(s) to read. Can specify multiple path tags.",
      validator: (value: any) => typeof value === "string" && value.length > 0,
    },
  ],
};
