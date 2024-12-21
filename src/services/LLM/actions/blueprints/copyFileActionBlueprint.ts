import { CopyFileAction } from "../CopyFileAction";
import { IActionBlueprint } from "../core/IAction";
import { ActionPriority } from "../types/ActionPriority";

export const copyFileActionBlueprint: IActionBlueprint = {
  tag: "copy_file",
  class: CopyFileAction,
  description: "Copy a file from source to destination path",
  usageExplanation: `The copy_file action creates a copy of a file in a new location. Here are common use cases:

1. Copy a file to a new location:
<copy_file>
  <source_path>src/services/OldService.ts</source_path>
  <destination_path>src/services/NewService.ts</destination_path>
</copy_file>

2. Create a backup before modifying:
<copy_file>
  <source_path>src/config.ts</source_path>
  <destination_path>src/config.backup.ts</destination_path>
</copy_file>

Note:
- Use relative paths from workspace root
- Destination directory must exist
- Will overwrite destination if it exists
- Preserves file permissions`,
  priority: ActionPriority.MEDIUM,
  canRunInParallel: true,
  requiresProcessing: false,
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
