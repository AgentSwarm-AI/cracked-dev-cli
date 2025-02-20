import { ConfigService } from "@services/ConfigService";
import { container } from "tsyringe";
import { IPhaseConfig, IPhasePromptArgs } from "../../types/PhaseTypes";

const configService = container.resolve(ConfigService);
const config = configService.getConfig();

export const strategyPhaseBlueprint: IPhaseConfig = {
  model: config.strategyModel,
  generatePrompt: (args: IPhasePromptArgs) => `
<phase_prompt>
<!-- These are internal instructions. Do not output. -->

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

### Example of how to behave
1. State goal
2. Dependencies
3. Implementation steps
4. Edge cases
5. Testing needs
6. end_phase

Then start some initial changes by using write_file and finally end_phase.


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

<list_directory_files>
 <!-- One or more paths -->
  <path>path/here</path>
  <path>path/here/2</path>
  <recursive>false</recursive>
  <!-- Use this action to list all files in a directory. Set recursive to true if you want to list files recursively. -->
</list_directory_files>

REMEMBER: ONLY ONE ACTION PER REPLY!!!
</write_file> 

<end_phase>
  <!-- Use this when strategy is complete. -->
</end_phase>


## Example of HOW NOT TO BEHAVE

- Here's the code:
\`\`\`typescript
some code here 
\`\`\`

### Do this instead!

- Here's the code:
<write_file>
  <type>new/update</type>
  <path>/path/here</path>
  <content>
    <!-- Full code. -->
  </content>
</write_file>


### Useful Commands
- Run all tests: ${args.runAllTestsCmd || "yarn jest"}
- Run a specific test: ${args.runOneTestCmd || "yarn jest {relativeTestPath}"}
- Run type check (all files): ${args.runAllFilesTypeCheckCmd || "yarn tsc --noEmit --skipLibCheck"}
- Run type check (single file): ${args.runOneFileTypeCheckCmd || "yarn tsc {filePath} --noEmit --skipLibCheck"}

# Available Actions

<execute_command>
  ...
</execute_command>

<read_directory>
  <!-- One or more paths -->
  <path>directory/path</path>
  <path>directory/path/2</path>
</read_directory>

### Other Actions
<action_explainer>
  <action>
   <!-- git_diff, git_pr_diff, fetch_url -->
  </action>
</action_explainer>

</phase_prompt>
`,
};
