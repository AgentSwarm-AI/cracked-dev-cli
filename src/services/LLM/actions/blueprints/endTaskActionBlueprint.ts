import { IActionBlueprint } from "../core/IAction";
import { EndTaskAction } from "../EndTaskAction";
import { ActionPriority } from "../types/ActionPriority";

export const endTaskActionBlueprint: IActionBlueprint = {
  tag: "end_task",
  class: EndTaskAction,
  description: "Mark a task as complete with a message",
  usageExplanation: `The end_task action marks the current task as complete. Here are common use cases:

1. Complete task with success message:
<end_task>
Successfully implemented new feature
</end_task>

2. Complete task with summary:
<end_task>
Created UserService with authentication methods:
- login()
- logout()
- validateToken()
All tests passing.
</end_task>

Note:
- Use clear, concise messages
- Include key accomplishments
- Mention any follow-up tasks
- Must be the last action
- Task cannot be resumed after ending`,
  priority: ActionPriority.LOWEST,
  canRunInParallel: false,
  requiresProcessing: false,
  parameters: [],
};
