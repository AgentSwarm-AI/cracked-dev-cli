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

## Flow
1. Follow strategy steps in order.
2. ONE action per response.
3. After each code change:
   - Run specific tests (runOneTestCmd) & type check.
   - Fix issues or report.
4. End task immediately when goal is met.
5. If prior phase wrote files, test (runOneTestCmd) & type check (runTypeCheckCmd) first. If good, <end_task>.

## Validation
- Before write_file: confirm imports/paths if unsure (execute_command/relative_path_lookup). If it's a test, make sure to run specific test (runOneTestCmd), before writing.
- After write_file: run specific test (runOneTestCmd) & type check (runTypeCheckCmd). If pass, continue/finish.

## Code Changes
- ONE at a time. Full code. Minimal approach.
- runOneTestCmd after each. Stop once done.

## Example
1. <write_file> ...
2. Run specific test (runOneTestCmd).
3. Type check (runTypeCheckCmd).
4. If pass, continue or <end_task>.

## Notes
- End task as soon as goal is met.
- One action per reply only.
- Use existing imports, dont add new deps.
- If stuck on import/path, use <relative_path_lookup>.
- Refrain from re-reading known files.

## Commands
- Run all tests: ${args.runAllTestsCmd || "yarn test"}
- Run one test: ${args.runOneTestCmd || "yarn test {relativeTestPath}"}
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
  <!-- Prompt before removing files or using sudo -->
  <!-- Any command like "ls -la" or "yarn install" -->
  <!-- Dont install extra dependencies unless allowed -->
  <!-- Use the project's package manager -->
  <!-- Use raw text only -->
  <!-- Avoid git commands here. Prefer git_diff and git_pr_diff. Exception: git command not available on this instruction-->
</execute_command>
<search_string>
<!-- Use this to search for a string in a file -->
  <directory>/path/to/search</directory>
  <term>pattern to search</term>
</search_string>
<search_file>
  <!-- Use if you don't know where a file is -->
  <directory>/path/to/search</directory>
  <term>filename pattern</term>
</search_file>
<relative_path_lookup>
  <!-- CRITICAL: source_path is the file containing the broken imports -->
  <!-- ONCE YOU FIND THE CORRECT PATH MAKE SURE TO UPDATE YOUR IMPORTS! -->
  <source_path>/absolute/path/to/source/file.ts</source_path>
  <path>../relative/path/to/fix</path>
  <threshold>0.6</threshold>  <!-- Optional, defaults to 0.6. Higher means more strict. -->
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
