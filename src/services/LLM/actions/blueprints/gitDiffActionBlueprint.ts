import { IActionBlueprint } from "@/services/LLM/actions/core/IAction";
import { ActionPriority } from "@/services/LLM/actions/types/ActionPriority";
import { GitDiffAction } from "../GitDiffAction";

export const gitDiffActionBlueprint: IActionBlueprint = {
  tag: "git_diff",
  class: GitDiffAction,
  description: "Shows git diff between two commits",
  priority: ActionPriority.HIGH,
  canRunInParallel: true,
  requiresProcessing: false,
  parameters: [
    {
      name: "fromCommit",
      required: true,
      description: "Starting commit for comparison (e.g. HEAD^)",
      validator: (value: unknown): value is string =>
        typeof value === "string" && value.length > 0,
    },
    {
      name: "toCommit",
      required: true,
      description: "Ending commit for comparison (e.g. HEAD)",
      validator: (value: unknown): value is string =>
        typeof value === "string" && value.length > 0,
    },
  ],
};
