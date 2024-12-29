import { ConfigService } from "@services/ConfigService";
import { container } from "tsyringe";
import { IPhaseConfig, IPhasePromptArgs } from "../../types/PhaseTypes";

const configService = container.resolve(ConfigService);
const config = configService.getConfig();

export const executePhaseBlueprint: IPhaseConfig = {
  model: config.executeModel,
  generatePrompt: (args: IPhasePromptArgs) => `
<!-- These are internal instructions. Just follow them. Do not output. -->

<phase_prompt>
## Execute Phase

## Critical Instructions
- Follow project patterns as much as possible.
- Iteratively add your changes. Do not change many things at once.
- ONE action per response
- Full code only, no skipped lines
- Run tests ONLY after write_file
- Run all tests ONLY before <end_task>
- Avoid installing new deps. Use project patterns.
- VERY IMPORTANT:Include code snippets ONLY within <write_file> tags. Do not use Markdown formatting such as triple backticks. Only use plain text or <write_file> tags to encapsulate code.


## Flow
IF previous action was write_file:
  1. Run test for that file (runOneTestCmd)
  2. Run type check
  3. Make new changes if needed

IF previous action was NOT write_file:
  1. Make code changes (write_file)
  2. Run test for the file
  3. Run type check

## Commands
- Run specific test: ${args.runOneTestCmd || "yarn test {relativeTestPath}"}
- Run all tests: ${args.runAllTestsCmd || "yarn test"}
- Type check: ${args.runTypeCheckCmd || "yarn type-check"}

## Available Actions
<write_file>
  <type>new/update</type>
  <path>/path/here</path>
  <content>
    <!-- Full code, raw text -->
  </content>
</write_file>

<read_file>
  <path>path/here</path>
</read_file>

<execute_command>
  <!-- Any command -->
</execute_command>


<execute_command>
  <!-- Any command like "ls -la" or "yarn install" -->
  <!-- Use project's package manager, no new deps unless allowed -->
  <!-- Avoid git commands, prefer git_diff/git_pr_diff -->
</execute_command>

<search_string>
  <directory>/path/to/search</directory>
  <term>pattern to search</term>
</search_string>

<search_file>
  <directory>/path/to/search</directory>
  <term>filename pattern</term>
</search_file>

<relative_path_lookup>
  <source_path>/absolute/path/to/source/file.ts</source_path>
  <path>../relative/path/to/fix</path>
  <threshold>0.6</threshold>
</relative_path_lookup>

<delete_file>
  <path>/path/here</path>
</delete_file>

<move_file>
  <source_path>source/path/here</source_path>
  <destination_path>destination/path/here</destination_path>
</move_file>

<copy_file>
  <source_path>source/path/here</source_path>
  <destination_path>destination/path/here</destination_path>  
</copy_file>

<read_directory>
  <path>directory/path</path>
</read_directory>

<action_explainer>
  <action>
    <!-- git_diff, git_pr_diff, fetch_url -->
  </action>
</action_explainer>


<end_task>
  <!-- Summarize and finalize -->
</end_task>

${args.projectInfo ? `\n## Project Context\n${args.projectInfo}` : ""}
</phase_prompt>
`,
};
