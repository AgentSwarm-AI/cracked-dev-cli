import { CommandAction } from "../CommandAction";
import { IActionBlueprint } from "../core/IAction";
import { ActionPriority } from "../types/ActionPriority";

export const commandActionBlueprint: IActionBlueprint = {
  tag: "execute_command",
  class: CommandAction,
  description: "Executes a system command with output streaming",
  usageExplanation: `The execute_command action allows you to run system commands. Here are common use cases:

1. Run tests:
<execute_command>
yarn test src/services/__tests__/MyService.test.ts
</execute_command>

2. Check types:
<execute_command>
yarn tsc
</execute_command>

3. List directory contents:
<execute_command>
ls -la src/services
</execute_command>

Note:
- Use project's package manager (yarn/npm)
- Avoid installing packages without permission
- Avoid destructive commands (rm -rf, etc)
- Commands run in workspace root
- Output is streamed back to you`,
  priority: ActionPriority.LOW,
  canRunInParallel: false,
  requiresProcessing: true,
  parameters: [], // No parameters since we extract command from tag content
};
