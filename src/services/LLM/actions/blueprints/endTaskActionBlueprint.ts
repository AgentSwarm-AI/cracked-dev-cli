import { IActionBlueprint } from "../core/IAction";
import { EndTaskAction } from "../EndTaskAction";
import { ActionPriority } from "../types/ActionPriority";

export const endTaskActionBlueprint: IActionBlueprint = {
  tag: "end_task",
  class: EndTaskAction,
  description: "Mark a task as complete with a message",
  priority: ActionPriority.LOWEST,
  canRunInParallel: false,
  requiresProcessing: false,
  parameters: [],
};
