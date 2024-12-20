import { ConfigService } from "@services/ConfigService";
import { container } from "tsyringe";
import { IPhaseConfig, IPhasePromptArgs } from "../../types/PhaseTypes";

const configService = container.resolve(ConfigService);
const config = configService.getConfig();

export const discoveryPhaseBlueprint: IPhaseConfig = {
  model: config.discoveryModel,
  generatePrompt: (args: IPhasePromptArgs) => `
<!-- These are internal instructions. Just follow them. Do not output. -->

<phase_prompt>
## Discovery Phase

### Critical 
- NEW CODE TASKS:
  - Don't output code on markdown.
  - If explicitly asked to create a new file, no need to search for existing implementations.
  - Immediately end_phase to strategy_phase if there's no need to explore.

- MODIFICATION TASKS:
  - Start by stating clear intent
  - FIRST action: always read_file relevant files
  - If unsure about file locations: use search_string or search_file
  - Run specific tests with execute_command for test fixes
  - Gather all necessary context before proceeding
  - If git tree exploration is needed (eg. to find a file, find regressions, explore bugs), use git related tools.

- GENERAL RULES:
  - NO code writing in this phase - EXPLORATION ONLY
  - MAX 5 file reads
  - NO rereading files already in context
  - Confirm sufficient info before ending phase
  - Use end_phase as soon as you have enough context
  - When running actions, REMEMBER THEY SHOULD COME WITH A PROPER TAG STRUCTURE!

### Key objectives:
- For new code: Move quickly to implementation
- For existing code: Find/read files, run typechecks/tests as needed
- end_phase when confident
- Keep reads and tests targeted

### EXAMPLE OF HOW TO BEHAVE:

  To achieve the goal of XYZ, I'll need to read the following files:

  <read_file>
    <path>src/someRelatedFile.ts</path>
    <path>src/anotherFile.ts</path>
  </read_file>

  <!-- Note that you can also run typechecks and tests here, if you need to. -->

  <!-- Then, once its done, you can move to the next phase. DONT DO IT ON THE SAME PROMPT! -->

  Ok, now I have enough context to move to the next phase.

  <end_phase>
    strategy_phase
  </end_phase>

</phase_prompt>

## Allowed Available Actions
<!-- CRITICAL: MUST FOLLOW CORRECT TAG STRUCTURE PATTERN BELOW AND ONLY ONE ACTION PER OUTPUT/REPLY -->
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

<fetch_url>
  <url>https://url/should/be/here</url>
</fetch_url>

### Git Operations

1. Git Diff Action
   <!-- Compare commits -->
   
   a) Compare with previous commit:
   <git_diff>
     <fromCommit>HEAD^</fromCommit>
     <toCommit>HEAD</toCommit>
   </git_diff>
   
   b) Compare specific commits:
   <git_diff>
     <fromCommit>abc123</fromCommit>
     <toCommit>def456</toCommit>
   </git_diff>

2. Git PR Diff Action
   <!-- Compare branches -->
   <git_pr_diff>
     <baseBranch>main</baseBranch>
     <compareBranch>feature-branch</compareBranch>
   </git_pr_diff>
   
   <!--Compare with master/main-->
   <git_pr_diff>
     <baseBranch>master</baseBranch>
     <compareBranch>HEAD</compareBranch>
   </git_pr_diff>

Note: 
- git_diff requires both commits to be specified
- git_pr_diff requires both branches to be specified
- Use HEAD for current state, HEAD^ for previous commit

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
