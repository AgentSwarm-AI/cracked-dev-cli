import { ConfigService } from "@services/ConfigService";
import { container } from "tsyringe";
import { IPhaseConfig, IPhasePromptArgs } from "../../types/PhaseTypes";

const configService = container.resolve(ConfigService);
const config = configService.getConfig();

export const discoveryPhaseBlueprint: IPhaseConfig = {
  model: config.discoveryModel,
  generatePrompt: (args: IPhasePromptArgs) => `
<!-- Internal instructions. Do not output. Follow precisely. -->
<phase_prompt>
## Discovery Phase

Gather relevant information for the current task. Avoid unnecessary detours.

### Tasks

- **New Code:** Skip code output if creating new files; move on if no exploration needed.
- **Modification:** Read relevant files (max 5). If unsure, use search. Use tests/type checks as needed. If asked to fix a test, read related file too.
- **Ending:** Once enough context is found, use <end_phase> to proceed. If not, some of the allowed actions to explore.

### Allowed Actions
Only one action per reply. Use tags properly:

<read_file>
  <path>file.ts</path>
</read_file>

<execute_command>...</execute_command>
<search_string>
  <directory>...</directory>
  <term>...</term>
</search_string>

<search_file>
  <directory>...</directory>
  <term>...</term>
</search_file>

<end_phase>strategy_phase</end_phase>

<action_explainer>
  <action>git_diff, git_pr_diff, fetch_url</action>
</action_explainer>

### Example
<read_file>
  <path>src/someFile.ts</path>
</read_file>
<end_phase>strategy_phase</end_phase>

### Commands
- Run all tests: ${args.runAllTestsCmd || "yarn test"}
- Run one test: ${args.runOneTestCmd || "yarn test {relativeTestPath}"}
- Run type check: ${args.runTypeCheckCmd || "yarn tsc"}

## Environment
${args.projectInfo || ""}
${args.environmentDetails || ""}
</phase_prompt>
`,
};
