import { ActionExplainerAction } from "../ActionExplainerAction";
import { IActionBlueprint } from "../core/IAction";
import { ActionPriority } from "../types/ActionPriority";

export const actionExplainerBlueprint: IActionBlueprint = {
  tag: "action_explainer",
  class: ActionExplainerAction,
  description: "Get detailed explanation of how to use an action",
  usageExplanation: `The action_explainer helps you understand how to use other actions. Here are common use cases:

1. Get help with a specific action:
<action_explainer>
  <action>write_file</action>
</action_explainer>

2. Learn about a new action:
<action_explainer>
  <action>git_diff</action>
</action_explainer>

Note:
- Use when unsure about action syntax
- Shows parameters and examples
- Provides usage tips and notes
- Available for all actions
- Returns formatted explanation`,
  priority: ActionPriority.HIGH,
  canRunInParallel: true,
  requiresProcessing: false,
  parameters: [
    {
      name: "action",
      required: true,
      description:
        "The action tag to get explanation for (e.g. read_file, write_file)",
      validator: (value: unknown): value is string =>
        typeof value === "string" && value.length > 0,
    },
  ],
};
