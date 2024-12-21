import { IActionBlueprint } from "../core/IAction";
import { DeleteFileAction } from "../DeleteFileAction";
import { ActionPriority } from "../types/ActionPriority";

export const deleteFileActionBlueprint: IActionBlueprint = {
  tag: "delete_file",
  class: DeleteFileAction,
  description: "Delete a file at the specified path",
  usageExplanation: `The delete_file action permanently removes a file. Here are common use cases:

1. Delete a specific file:
<delete_file>
  <path>src/services/OldService.ts</path>
</delete_file>

2. Delete a temporary file:
<delete_file>
  <path>src/config.backup.ts</path>
</delete_file>

Note:
- Use relative paths from workspace root
- Action is irreversible
- File must exist
- Consider backing up before deleting
- Remove imports to deleted file`,
  priority: ActionPriority.MEDIUM,
  canRunInParallel: false,
  requiresProcessing: false,
  parameters: [
    {
      name: "path",
      required: true,
      description: "The path of the file to delete",
      validator: (value: any) => typeof value === "string" && value.length > 0,
    },
  ],
};
