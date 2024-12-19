import { IActionBlueprint } from "@/services/LLM/actions/core/IAction";
import { ActionPriority } from "@/services/LLM/actions/types/ActionPriority";
import { GitDiffAction } from "../GitDiffAction";

export const gitDiffActionBlueprint: IActionBlueprint = {
  tag: "git_diff",
  class: GitDiffAction,
  description: "Shows git diff for specified file or entire repository",
  priority: ActionPriority.HIGH,
  canRunInParallel: true,
  requiresProcessing: false,
  parameters: [
    {
      name: "path",
      required: false,
      description: "Optional file path to get diff for",
      validator: (value: unknown): value is string =>
        typeof value === "string" && value.length > 0,
    },
  ],
};
