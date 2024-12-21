import { IActionBlueprint } from "@/services/LLM/actions/core/IAction";
import { ActionPriority } from "@/services/LLM/actions/types/ActionPriority";
import { GitPRDiffAction } from "../GitPRDiffAction";

export const gitPRDiffActionBlueprint: IActionBlueprint = {
  tag: "git_pr_diff",
  class: GitPRDiffAction,
  description: "Shows diff between two branches (PR comparison)",
  usageExplanation: `The git_pr_diff action compares changes between two branches, useful for PR reviews. Here are common use cases:

1. Compare feature branch with main:
<git_pr_diff>
  <baseBranch>main</baseBranch>
  <compareBranch>feature-branch</compareBranch>
</git_pr_diff>

2. Compare current branch with main:
<git_pr_diff>
  <baseBranch>main</baseBranch>
  <compareBranch>HEAD</compareBranch>
</git_pr_diff>

Note:
- baseBranch is the target branch (e.g. main, master)
- compareBranch is the source branch (your changes)
- Use HEAD to reference current branch
- The diff shows: added (+), removed (-), and modified lines`,
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
