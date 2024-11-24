import { IActionBlueprint } from "../core/IAction";
import { EndTaskAction } from "../EndTaskAction";

export const endTaskActionBlueprint: IActionBlueprint = {
  tag: "end_task",
  class: EndTaskAction,
  description: "Mark a task as complete with a message",
  priority: 4, // Highest priority to run last
  canRunInParallel: false,
  parameters: [],
};
