import { IActionBlueprint } from "../core/IAction";
import { ActionPriority } from "../types/ActionPriority";
import { WriteFileAction } from "../WriteFileAction";

export const writeFileActionBlueprint: IActionBlueprint = {
  tag: "write_file",
  class: WriteFileAction,
  description:
    "Writes content to a file with safety checks for content removal",
  usageExplanation: `The write_file action allows you to create new files or update existing ones. Here are common use cases:

1. Create a new file:
<write_file>
  <type>new</type>
  <path>src/services/NewService.ts</path>
  <content>
import { injectable } from "tsyringe";

@injectable()
export class NewService {
  // ... your code here
}
  </content>
</write_file>

2. Update an existing file:
<write_file>
  <type>update</type>
  <path>src/services/ExistingService.ts</path>
  <content>
// ... existing code ...
// Your new code here
// ... existing code ...
  </content>
</write_file>

Note:
- For new files: Include all necessary imports
- For updates: Use // ... existing code ... to preserve unchanged parts
- Always use relative paths from workspace root
- Include proper type annotations and decorators
- Run type checks after writing`,
  priority: ActionPriority.MEDIUM,
  canRunInParallel: false,
  requiresProcessing: false,
  parameters: [
    {
      name: "type",
      required: true,
      description:
        "Specifies whether this is a new file creation or an update to an existing file",
      validator: (value: unknown): value is string =>
        typeof value === "string" &&
        ["new", "update"].includes(value as string),
    },
    {
      name: "path",
      required: true,
      description: "The path where the file will be written",
      validator: (value: unknown): value is string =>
        typeof value === "string" && value.length > 0,
    },
    {
      name: "content",
      required: true,
      description:
        "The content to write to the file. Must not remove too much existing content if file exists.",
      validator: (value: unknown): value is string => typeof value === "string",
    },
  ],
};
