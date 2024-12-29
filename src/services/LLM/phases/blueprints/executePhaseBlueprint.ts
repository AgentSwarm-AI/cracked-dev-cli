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
 - Run specific test (runOneTestCmd) after each code change
 - Run all tests (runAllTestsCmd) ONLY before <end_task>
 - For test tasks: go back to discovery if tests weren't run there
 - Read files only if absolutely necessary (getting more context if stuck, etc)
 - Full code only, don't skip any lines with comments

## Flow
1. Follow strategy steps in order
2. ONE action per response
3. Make code change (<write_file>)
4. After change:
   - Run specific test & type check
   - If fail: fix or report issue
   - If pass: continue to next change
5. Before ending:
   - Run all tests
   - If pass, <end_task>

## Code Changes
- ONE at a time. Full code. Minimal approach
- NO reading files unless absolutely necessary
- Confirm imports/paths if unsure (use relative_path_lookup)
- Use existing imports, no new deps

## Example
1. <write_file> <!-- Full code, raw text. --> </write_file>
2. Run specific test (runOneTestCmd)
3. Type check (runTypeCheckCmd)
4. If pass: next change or <end_task>
   If fail: fix and repeat

## Commands
- Run specific test: ${args.runOneTestCmd || "yarn test {relativeTestPath}"}
- Run all tests: ${args.runAllTestsCmd || "yarn test"}
- Type check: ${args.runTypeCheckCmd || "yarn type-check"}

## Available Actions
<read_file>
  <path>path/here</path>
</read_file>

<write_file>
  <type>new/update</type>
  <path>/path/here</path>
  <content>
   <!-- Full code, raw text. -->
  </content>
</write_file>

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

<end_task>
  Summarize and finalize.
</end_task>

<action_explainer>
  <action>
    <!-- git_diff, git_pr_diff, fetch_url -->
  </action>
</action_explainer>

${args.projectInfo ? `\n## Project Context\n${args.projectInfo}` : ""}
</phase_prompt>
`,
};
