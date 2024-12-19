import { IActionBlueprint } from "@/services/LLM/actions/core/IAction";
import { ActionPriority } from "@/services/LLM/actions/types/ActionPriority";
import { GitPRDiffAction } from "../GitPRDiffAction";

export const gitPRDiffActionBlueprint: IActionBlueprint = {
  tag: "git_pr_diff",
  class: GitPRDiffAction,
  description: "Shows diff between two branches (PR comparison)",
  priority: ActionPriority.HIGH,
  canRunInParallel: true,
  requiresProcessing: false,
  parameters: [
    {
      name: "baseBranch",
      required: true,
      description: "Base branch for comparison",
      validator: (value: unknown): value is string =>
        typeof value === "string" && value.length > 0,
    },
    {
      name: "compareBranch",
      required: true,
      description: "Branch to compare against base",
      validator: (value: unknown): value is string =>
        typeof value === "string" && value.length > 0,
    },
  ],
};
