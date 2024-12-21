import { IActionBlueprint } from "../core/IAction";
import { MoveFileAction } from "../MoveFileAction";
import { ActionPriority } from "../types/ActionPriority";

export const moveFileActionBlueprint: IActionBlueprint = {
  tag: "move_file",
  class: MoveFileAction,
  description: "Move a file from source to destination path",
  usageExplanation: `The move_file action moves or renames a file. Here are common use cases:

1. Move a file to a different directory:
<move_file>
  <source_path>src/utils/helper.ts</source_path>
  <destination_path>src/services/utils/helper.ts</destination_path>
</move_file>

2. Rename a file:
<move_file>
  <source_path>src/services/OldName.ts</source_path>
  <destination_path>src/services/NewName.ts</destination_path>
</move_file>

Note:
- Use relative paths from workspace root
- Destination directory must exist
- Will overwrite destination if it exists
- Original file is removed after move
- Update imports after moving`,
  priority: ActionPriority.MEDIUM,
  canRunInParallel: false,
  requiresProcessing: false,
  parameters: [
    {
      name: "source_path",
      required: true,
      description: "The source path of the file to move",
      validator: (value: any) => typeof value === "string" && value.length > 0,
    },
    {
      name: "destination_path",
      required: true,
      description: "The destination path for the file",
      validator: (value: any) => typeof value === "string" && value.length > 0,
    },
  ],
};
