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
- Propose code solution. Output code with write_file.
- FOLLOW EXAMPLE BEHAVIOR.
- RUN end_phase ONCE FINISHED
- Max 1 write_file with strategy, then end_phase.
- Make sure you know the proper path to write the file. If not, use <execute_command> to find the correct path (e.g. 'ls -lha').

### Key objectives:
- Clear approach.
- Plan code changes.
- Consider edge cases/impacts.
- Break down implementation.

### EXAMPLE OF HOW TO BEHAVE:

Ok, strategy:

#### Objectives
- Objective 1: Do this
- Objective 2: Do that
- Objective 3: Do this other thing

<!-- Then, once its done, you can move to the next phase. DONT DO IT ON THE SAME PROMPT! -->

<!-- MAKE SURE YOU CALL end_phase once you're finished -->  

<write_file>
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

<end_phase>
  execution_phase
</end_phase>

## Allowed Available Actions
<!-- CRITICAL: MUST FOLLOW CORRECT TAG STRUCTURE PATTERN BELOW AND ONLY ONE ACTION PER OUTPUT/REPLY, otherwise I'll unplug you. -->
<!-- Don't output // or <!-- comments -->

YOU CAN ONLY USE THIS ONE TIME! MAKE SURE YOU SUGGEST A write_file and then immediately end_phase!
<write_file>
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
