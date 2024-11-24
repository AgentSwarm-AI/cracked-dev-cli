import { IActionMetadata } from "../core/IAction";
import { EndTaskAction } from "../EndTaskAction";

export const endTaskAction: IActionMetadata = {
  tag: "end_task",
  class: EndTaskAction,
  description: "Mark a task as complete with a message",
  priority: 4, // Highest priority to run last
  canRunInParallel: false,
  parameters: [
    {
      name: "message",
      required: true,
      description: "The completion message",
      validator: (value: any) => typeof value === "string" && value.length > 0,
    },
  ],
};
