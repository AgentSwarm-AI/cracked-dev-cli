import { IActionBlueprint } from "../core/IAction";
import { EndPhaseAction } from "../EndPhaseAction";
import { ActionPriority } from "../types/ActionPriority";

export const endPhaseActionBlueprint: IActionBlueprint = {
  tag: "end_phase",
  class: EndPhaseAction,
  description: "Ends the current phase and transitions to the next phase",
  parameters: [],
  requiresProcessing: true,
  priority: ActionPriority.CRITICAL, // High priority to ensure phase transition happens before other actions
};
