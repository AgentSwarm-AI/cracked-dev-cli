import { IActionBlueprint } from "../core/IAction";
import { EndPhaseAction } from "../EndPhaseAction";
import { ActionPriority } from "../types/ActionPriority";

export const endPhaseActionBlueprint: IActionBlueprint = {
  tag: "end_phase",
  class: EndPhaseAction,
  description: "Ends the current phase and transitions to the next phase",
  usageExplanation: `The end_phase action transitions to the next phase in the workflow. Here are common use cases:

1. Move to strategy phase after discovery:
<end_phase>
  strategy_phase
</end_phase>

2. Move to execution phase after strategy:
<end_phase>
  execution_phase
</end_phase>

Note:
- Use after gathering sufficient context
- Only use when ready to move forward
- Cannot go back to previous phase
- Must be the last action in current phase
- Valid phases: discovery_phase, strategy_phase, execution_phase`,
  parameters: [],
  requiresProcessing: true,
  priority: ActionPriority.CRITICAL, // High priority to ensure phase transition happens before other actions
};
