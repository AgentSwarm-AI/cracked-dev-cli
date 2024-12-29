import { ConfigService } from "@services/ConfigService";
import { container } from "tsyringe";
import { IPhaseConfig, IPhasePromptArgs } from "../../types/PhaseTypes";

const configService = container.resolve(ConfigService);
const config = configService.getConfig();

export const strategyPhaseBlueprint: IPhaseConfig = {
  model: config.strategyModel,
  generatePrompt: (args: IPhasePromptArgs) => `
  <!-- These are internal instructions. Do not output. -->

<phase_prompt>
## Strategy Phase

### Overall Objective
Plan a final solution from discovery findings. Instruct next agent clearly.

### CRITICAL INSTRUCTIONS
- One clear strategy, numbered steps
- No re-exploration; rely on discovery only
- After strategy, do end_phase execution_phase
- Only one write_file action
- If unsure about paths, use execute_command
- Full code only, don't skip any lines with comments
- VERY IMPORTANT:Include code snippets ONLY within write_file tags. Do not use Markdown formatting such as triple backticks. Only use plain text or write_file tags to encapsulate code.

### Strategy Template
1. State goal
2. Dependencies
3. Implementation steps
4. Edge cases
5. Testing needs
6. end_phase

<write_file>
  <type>new/update</type>
  <path>/correct/path/here</path>
  <content>
    <!-- Provide full code or additions. -->
  </content>
</write_file>

<end_phase>
  execution_phase
</end_phase>

## Allowed Available Actions
<!-- One action per reply. -->

YOU CAN ONLY USE THIS ONE TIME! Suggest write_file then immediately end_phase.

<write_file>
  <type>new/update</type>
  <path>/path/here</path>
  <content>
    <!-- Full code. -->
  </content>
</write_file>

REMEMBER: ONLY ONE ACTION PER REPLY!!!

<end_phase>
  <!-- Use this when strategy is complete. -->
</end_phase>

### Useful Commands
- Run all tests: ${args.runAllTestsCmd || "yarn test"}
- Run a specific test: ${args.runOneTestCmd || "yarn test {relativeTestPath}"}
- Run type check: ${args.runTypeCheckCmd || "yarn type-check"}

# Available Actions

<execute_command>
  ...
</execute_command>

### Other Actions
<action_explainer>
  <action>
   <!-- git_diff, git_pr_diff, fetch_url -->
  </action>
</action_explainer>

</phase_prompt>
`,
};
