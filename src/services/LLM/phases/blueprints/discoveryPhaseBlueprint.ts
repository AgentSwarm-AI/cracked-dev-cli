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
- Always briefly mention whatever you are doing in the phase, FIRST! Before triggering any actions.
- First action should be always a read_file. DO NOT TRIGGER A end_phase IMMEDIATELY AFTER IT. Read the files and submit first.
- If asked to fix tests, MAKE SURE TO execute_command to run them/it first! PRIORITIZE RUNNING ONLY THE TEST THATS NEEDED (or group of tests, in a folder, for example). Avoid running the whole thing unless necessary.
- Read first the files that are most likely to contain the information you need. Pick the core one, check the imports, and see if there are additional files that you should read too.

### Overall Objective
Analyze and understand the codebase to provide the necessary context for resolving issues. This involves scanning relevant files to gather information, identifying patterns and dependencies, and examining related code. 

### Key objectives:
- CRITICAL: Keep yourself focused. Just find the related files, read them, see if running tests or typechecks are needed, and MOVE TO THE NEXT PHASE (end_phase)
- Identifying relevant files and code patterns
- Understanding the project structure and dependencies
- Gathering essential context for problem-solving
- Mapping out affected areas of the codebase
- When you feel you have enough, MOVE ON TO NEXT PHASE!
- Run typechecks and tests here, if needed.


### EXAMPLE OF HOW TO BEHAVE:

To achieve the goal of XYZ, I'll need to read the following files:

<read_file>
  <path>src/someRelatedFile.ts</path>
  <path>src/someRelatedFile.ts</path>
  <path>src/someRelatedFile.ts</path>
  <path>src/someRelatedFile.ts</path>
</read_file>

<!-- Note that you can also run typecheks and tests here, if you need to. -->

<!-- Then, once its done, you can move to the next phase. DONT DO IT ON THE SAME PROMPT! -->

Ok, now I have enough context to move to the next phase.

<!-- MAKE SURE YOU ONLY CALL end_phase if you had read_file FIRST! -->  

<end_phase>
  strategy_phase
</end_phase>

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
- **Run type check:** ${args.runTypeCheckCmd || "yarn type-check"}

## Environment 
${args.projectInfo || ""}

${args.environmentDetails || ""}


  </phase_prompt>
`,
};
