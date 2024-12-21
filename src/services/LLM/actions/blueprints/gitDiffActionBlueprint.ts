import { IActionBlueprint } from "@/services/LLM/actions/core/IAction";
import { ActionPriority } from "@/services/LLM/actions/types/ActionPriority";
import { GitDiffAction } from "../GitDiffAction";

export const gitDiffActionBlueprint: IActionBlueprint = {
  tag: "git_diff",
  class: GitDiffAction,
  description: "Shows git diff between two commits",
  usageExplanation: `The git_diff action compares changes between two commits. Here are common use cases:

1. Compare with previous commit:
<git_diff>
  <fromCommit>HEAD^</fromCommit>
  <toCommit>HEAD</toCommit>
</git_diff>

2. Compare specific commits:
<git_diff>
  <fromCommit>abc123</fromCommit>
  <toCommit>def456</toCommit>
</git_diff>

Note: 
- Use HEAD for current state
- Use HEAD^ for previous commit
- Use commit hashes for specific commits
- The diff shows: added (+), removed (-), and modified lines`,
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
