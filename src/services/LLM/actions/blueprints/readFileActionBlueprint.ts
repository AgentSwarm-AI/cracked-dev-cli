import { IActionBlueprint } from "../core/IAction";
import { ReadFileAction } from "../ReadFileAction";
import { ActionPriority } from "../types/ActionPriority";

export const readFileActionBlueprint: IActionBlueprint = {
  tag: "read_file",
  class: ReadFileAction,
  description: "Reads content from one or more files",
  usageExplanation: `The read_file action allows you to read the contents of one or more files. Here are common use cases:

1. Read a single file:
<read_file>
  <path>src/services/MyService.ts</path>
</read_file>

2. Read multiple files at once:
<read_file>
  <path>src/services/MyService.ts</path>
  <path>src/types/MyTypes.ts</path>
</read_file>

Note:
- Use relative paths from the workspace root
- You can read up to 4 files at once
- Avoid reading the same file multiple times
- If you can't find a file, use search_file first`,
  priority: ActionPriority.CRITICAL,
  canRunInParallel: true,
  requiresProcessing: true,
  parameters: [
    {
      name: "path",
      required: true,
      description:
        "The path(s) of the file(s) to read. Can specify multiple path tags.",
      validator: (value: unknown): value is string =>
        typeof value === "string" && value.length > 0,
    },
  ],
};
