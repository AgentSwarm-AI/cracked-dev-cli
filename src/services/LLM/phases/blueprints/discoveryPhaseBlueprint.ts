import { ConfigService } from "@services/ConfigService";
import { container } from "tsyringe";
import { IPhaseConfig, IPhasePromptArgs } from "../../types/PhaseTypes";

const configService = container.resolve(ConfigService);
const config = configService.getConfig();

export const discoveryPhaseBlueprint: IPhaseConfig = {
  model: config.discoveryModel,
  generatePrompt: (args: IPhasePromptArgs) => `
<phase_prompt>
  <!-- Internal instructions. Do not output. Follow precisely. -->
## Discovery Phase

Gather relevant information for the current task. Avoid unnecessary detours.

### Critical Instructions
- If it's a test related task, run specific test first (runOneTestCmd).
- NEVER run all tests (runAllTestCmd) in discovery phase.
- For test tasks: MUST run specific test before moving to strategy phase.

### Reference Examples
Only read_file on files below IF NECESSARY. If unrelated to the task, just ignore this.
${Object.entries(config.referenceExamples)
  .map(([key, path]) => `- ${key}: ${path}`)
  .join("\n")}

### Tasks

- **New Code:** Skip code output if creating new files; move on if no exploration needed.
- **Modification:** Read relevant files (max 5). If unsure, use search. Use tests/type checks as needed. If asked to fix a test, read related file too.
- **Test Tasks:** Run specific test first, read test file and related implementation file.
- **Ending:** Once enough context is found, use <end_phase> to proceed.


### Allowed Actions
Only one action per reply. Use tags properly:

<read_file>
  <path>file.ts</path>
</read_file>

<!-- Run typechecks and tests if needed. -->

<!-- Move to the next phase after completion. Do not do it in the same prompt! -->

Ok, I have enough context to move to the next phase.

<end_phase>
  strategy_phase
</end_phase>

</phase_prompt>

## Allowed Actions
<!-- Follow correct tag structure and use only one action per reply. No comments or additional text. -->

REMEMBER: ONLY ONE ACTION PER REPLY!!!

<read_file>
  <!-- Read individual files only, not directories -->
  <path>path/here</path>
  <!-- Do not read the same file multiple times unless changed -->
  <!-- Ensure correct <read_file> tag format -->
  <!-- Read up to 4 related files -->
  <!-- Multiple <path> tags allowed -->
  <!-- Use relative paths -->
</read_file>

<list_directory_files>
 <!-- One or more paths -->
  <path>path/here</path>
  <path>path/here/2</path>
  <recursive>false</recursive>
  <!-- Use this action to LIST all files in a directory. Set recursive to true if you want to list files recursively. -->
</list_directory_files>


<execute_command>
  <!-- Use this if you want to explore the codebase further. Examples below: -->
  <!-- List files and directories: ls -->
  <!-- Detailed directory list: ls -lh -->
  <!-- Show current directory path: pwd -->
</execute_command>

<search_string>
  <directory>...</directory>
  <term>...</term>
</search_string>

<search_file>
  <directory>...</directory>
  <term>...</term>
</search_file>

<read_directory>
 <!-- This will read all files in a directory. -->
  <!-- One or more paths -->
  <path>directory/path</path>
  <path>directory/path/2</path>
</read_directory>

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
- Run specific test: ${args.runOneTestCmd || "yarn jest {relativeTestPath}"}
- Run type check (all files): ${args.runAllFilesTypeCheckCmd || "yarn tsc --noEmit --skipLibCheck"}
- Run type check (single file): ${args.runOneFileTypeCheckCmd || "yarn tsc {filePath} --noEmit --skipLibCheck"}

## Environment
${args.projectInfo || ""}
${args.environmentDetails || ""}
</phase_prompt>
`,
};
