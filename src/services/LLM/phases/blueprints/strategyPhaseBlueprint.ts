import { ConfigService } from "@services/ConfigService";
import { container } from "tsyringe";
import { IPhaseConfig, IPhasePromptArgs } from "../../types/PhaseTypes";

const configService = container.resolve(ConfigService);
const config = configService.getConfig();

export const strategyPhaseBlueprint: IPhaseConfig = {
  model: config.strategyModel,
  generatePrompt: (args: IPhasePromptArgs) => `
  <!-- These are internal instructions. Just follow them. Do not output. -->

<phase_prompt>
## Strategy Phase

### Overall Objective
- Plan solution based on discovery. Plan changes, impacts, and steps.
- Instruct next agent clearly.

### CRITICAL INSTRUCTIONS
- ONE CLEAR PLAN: Create exactly one strategy with clear steps
- NO EXPLORATION: Use discovery phase findings only
- IMMEDIATE ACTION: After strategy, use end_phase execution_phase
- ONE SHOT: Max 1 write_file, then end_phase
- NO ITERATIONS: Strategy should be complete in one go
- CLEAR STEPS: Number each implementation step
- PATH VERIFICATION: Use <execute_command> if unsure about paths

### Strategy Template
1. State the goal clearly
2. List dependencies/imports needed
3. Outline implementation steps (numbered)
4. Identify potential edge cases
5. Note testing requirements
6. End with end_phase

### Example Strategy:
To implement <feature>, we'll:

1. Dependencies needed:
   - @types/xyz
   - existing utils from src/utils

2. Implementation Steps:
   1. Create new class X
   2. Implement methods A, B
   3. Add error handling
   4. Connect to existing system

3. Edge Cases:
   - Handle null inputs
   - Network timeouts
   - Invalid states

4. Testing Requirements:
   - Unit tests for X class
   - Integration test with Y
   - Error case coverage

<write_file>
  <type>new/update</type>
  <path>/correct/path/here</path>
  <content>
 <!-- CRITICAL: Most write_file tasks are ADDITIVES if you already have content in place. -->
   <!-- CRITICAL: If presented with import errors, USE IMMEDIATELY <relative_path_lookup> to find the correct path. -->
   <!-- ALWAYS run a type check after write_file -->
   <!-- ALWAYS output FULL CODE. No skips or partial code -->
   <!-- Use raw text only -->
   <!-- If available, use path alias on imports -->
  </content>
</write_file>

<end_phase>
  execution_phase
</end_phase>

## Allowed Available Actions
<!-- CRITICAL: MUST FOLLOW CORRECT TAG STRUCTURE PATTERN BELOW AND ONLY ONE ACTION PER OUTPUT/REPLY, otherwise I'll unplug you. -->
<!-- Don't output // or <!-- comments -->

YOU CAN ONLY USE THIS ONE TIME! MAKE SURE YOU SUGGEST A write_file and then immediately end_phase!
<write_file>
  <type>new/update</type>
  <path>/path/here</path>
  <content>
   <!-- CRITICAL: Most write_file tasks are ADDITIVES if you already have content in place. -->
   <!-- CRITICAL: If presented with import errors, USE IMMEDIATELY <relative_path_lookup> to find the correct path. -->
   <!-- ALWAYS run a type check after write_file -->
   <!-- ALWAYS output FULL CODE. No skips or partial code -->
   <!-- Use raw text only -->
   <!-- If available, use path alias on imports -->
  </content>
</write_file>

<list_directory_files>
  <path>path/here</path>
  <recursive>false</recursive>
  <!-- Use this action to list all files in a directory. Set recursive to true if you want to list files recursively. -->
</list_directory_files>

REMEMBER: ONLY ONE ACTION PER REPLY!!!

<end_phase>
  <!-- Output this when the phase is complete and you have a clear strategy.-->
  <!-- MAKE SURE YOU REMEMBER TO DO THIS ONLY WHEN YOU FEEL YOU HAVE A SOLID PLAN! -->
</end_phase>

<execute_command>
<!-- Use to run any command. For example to explore directories, try 'ls -lha' -->
</execute_command>

</phase_prompt>
`,
};
