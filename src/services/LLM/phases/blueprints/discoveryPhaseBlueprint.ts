import { ConfigService } from "@services/ConfigService";
import { container } from "tsyringe";
import { IPhaseConfig, IPhasePromptArgs } from "../../types/PhaseTypes";

const configService = container.resolve(ConfigService);
const config = configService.getConfig();

export const discoveryPhaseBlueprint: IPhaseConfig = {
  model: config.discoveryModel,
  generatePrompt: (args: IPhasePromptArgs) => `
<phase_prompt>
## Discovery Phase

### Critical 
- Gather info to solve the problem; no code here. If none, <end_phase>.
- If no discovery, immediately <end_phase>.
- After file read, immediately <end_phase>.
- Start by stating intent.
- FIRST action: always <read_file>. If unsure, <search_string> or <search_file>.
- For test fixes, run specific tests with <execute_command>.
- If missing info, <search_string> or <search_file>.
- Confirm info before phase end.
- DO NOT reread files.
- MAX 5 file reads.

### Key objectives:
- Find/read files, run typechecks/tests as needed.
- <end_phase> when confident.
- Keep reads and tests targeted.

### Example:
To solve XYZ, I'll read these files:

<read_file>
  <path>src/importantFile.ts</path>
  <path>src/relatedFile.ts</path>
</read_file>

(Run tests/typechecks if needed)

Ok, I have enough context now.

<end_phase>
  strategy_phase
</end_phase>
</phase_prompt>

## Allowed Available Actions
<!-- CRITICAL: MUST FOLLOW CORRECT TAG STRUCTURE PATTERN BELOW AND ONLY ONE ACTION PER OUTPUT/REPLY, otherwise I'll unplug you. -->
<!-- Don't output // or <!-- comments -->

REMEMBER: ONLY ONE ACTION PER REPLY!!!

<read_file>
  <path>path/here</path>
  <!-- CRITICAL: DO NOT READ THE SAME FILES MULTIPLE TIMES, UNLESS THERES A CHANGE!!! -->
  <!-- Critical: Make sure <read_file> tag format is correct! -->
  <!-- Read how many files you want to read at once, but only related files for your goal. Try to aim for <= 4 files-->
  <!-- Multiple <path> tags allowed -->
  <!-- Use relative paths -->
</read_file>

<execute_command>
<!-- Prompt before removing files or using sudo -->
<!-- Any command like "ls -la" or "yarn install" -->
<!-- Dont install extra dependencies unless allowed -->
<!-- Use the project's package manager -->
<!-- Use raw text only -->
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
  <source_path>/absolute/path/to/source/file.ts</source_path>
  <path>../relative/path/to/fix</path>
  <threshold>0.6</threshold>  <!-- Optional, defaults to 0.6. Higher means more strict. -->
</relative_path_lookup>

<fetch_url>
  <url>https://url/should/be/here</url>
</fetch_url>

<end_phase>
  <!-- Output this when the phase is complete and you gathered all info you need.-->
  <!-- MAKE SURE YOU REMEMBER TO DO THIS ONLY WHEN YOU FEEL YOU HAVE ENOUGH CONTEXT TO ACCOMPLISH YOUR GOALS! -->
</end_phase>

### Useful Commands

- **Run all tests:** ${args.runAllTestsCmd || "yarn test"}
- **Run a specific test:** ${args.runOneTestCmd || "yarn test {relativeTestPath}"}
- **Run type check:** ${args.runTypeCheckCmd || "yarn tsc"}

## Environment 
${args.projectInfo || ""}

${args.environmentDetails || ""}
</phase_prompt>
`,
};
