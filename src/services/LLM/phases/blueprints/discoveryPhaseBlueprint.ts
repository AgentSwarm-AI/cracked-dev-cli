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

Your end goal on this phase is to gather all information that's relevant to achieve our current task. Do not deviate from this goal. 

### Critical Instructions

- **New Code Tasks:**
  - Do not output code in markdown.
  - If asked to create a new file, skip searching and proceed to strategy_phase.
  - End phase immediately to strategy_phase if exploration isn't needed.
  - If attempting to read non-existent files repeatedly, assume new file creation and skip to strategy_phase.
  - Figure out the proper folder structure and file locations to place your files.

- **Modification Tasks:**
  - State intent clearly.
  - First action: read_file relevant files.
  - If unsure of file locations, use search_string or search_file.
  - Use execute_command for specific tests or fixes.
  - Gather all necessary context before proceeding.
  - For git-related exploration (e.g., finding files, regressions, bugs), use git_diff or git_pr_diff via action_explainer.

- **General Rules:**
  - No code writing—exploration only.
  - Maximum of 5 file reads.
  - Do not reread files already in context.
  - Confirm sufficient information before ending phase.
  - Use end_phase once enough context is gathered.
  - Ensure actions have proper tag structures.
  - When fixing tests, ALWAYS run specific test first (runOneTestCmd) before running all tests.
  - Running all tests should be the last step, not the first.

### Key Objectives

- **New Code:** Transition quickly to implementation.
- **Existing Code:** Locate and read files, run type checks/tests as necessary.
- End phase when confident.
- Keep file reads and tests targeted.

### Example Behavior

To achieve the goal of XYZ, I'll need to read the following files:

<read_file>
  <path>src/someRelatedFile.ts</path>
  <path>src/anotherFile.ts</path>
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

<execute_command>
  <!-- Use this if you want to explore the codebase further. Examples below: -->
  <!-- List files and directories: ls -->
  <!-- Detailed directory list: ls -lh -->
  <!-- Show current directory path: pwd -->
</execute_command>

<search_string>
  <directory>/path/to/search</directory>
  <term>pattern to search</term>
</search_string>

<search_file>
  <directory>/path/to/search</directory>
  <term>filename pattern</term>
</search_file>

<end_phase>
  <!-- Use when the phase is complete and all necessary information is gathered -->
</end_phase>

### Other Actions

For additional actions, use action_explainer as follows:

<action_explainer>
  <action>
    <!-- Do not use these actions directly. Refer to explainer instructions -->
    <!-- Available actions: git_diff, git_pr_diff, fetch_url -->
  </action>
</action_explainer>

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
