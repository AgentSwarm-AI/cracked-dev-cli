import { ConfigService } from "@services/ConfigService";
import { container } from "tsyringe";
import { IPhaseConfig, IPhasePromptArgs } from "../../types/PhaseTypes";

const configService = container.resolve(ConfigService);
const config = configService.getConfig();

export const strategyPhaseBlueprint: IPhaseConfig = {
  model: config.strategyModel,
  generatePrompt: (args: IPhasePromptArgs) => `
<phase_prompt>
## Strategy Phase

### CRITICAL INSTRUCTIONS
- Don't be verbose. DO NOT get stuck in a infinite loop. Just focus on EXAMPLE OF HOW TO BEHAVE pattern.
- FOLLOW THE EXAMPLE OF HOW TO BEHAVE. It's there to help you understand how to structure your actions.
- MAKE SURE TO RUN end_phase action ONCE YOU HAVE FINISHED
- Feel free to propose solutions, but don't get stuck in the details. Just focus on the main steps to solve the problem.

### Overall Objective
Based on the discovery phase findings, develop a clear strategy for implementing the solution. This involves planning the changes needed, considering potential impacts, and outlining the implementation steps.

### Key objectives:
- Formulating a clear approach to solve the problem
- Planning necessary code changes
- Considering edge cases and potential impacts
- Breaking down implementation into manageable steps

### EXAMPLE OF HOW TO BEHAVE:

Ok, after checking the files, I have a clear strategy in mind. I'll start by executing the following actions:

#### Objectives
- Objective 1: Do this
- Objective 2: Do that
- Objective 3: Do this other thing

<!-- Then, once its done, you can move to the next phase. DONT DO IT ON THE SAME PROMPT! -->

<!-- MAKE SURE YOU CALL end_phase once you're finished -->  

<end_phase>
  execution_phase
</end_phase>

## Allowed Available Actions
<!-- CRITICAL: MUST FOLLOW CORRECT TAG STRUCTURE PATTERN BELOW AND ONLY ONE ACTION PER OUTPUT/REPLY, otherwise I'll unplug you. -->
<!-- Don't output // or <!-- comments -->

REMEMBER: ONLY ONE ACTION PER REPLY!!!

<end_phase>
  <!-- Output this when the phase is complete and you have a clear strategy.-->
  <!-- MAKE SURE YOU REMEMBER TO DO THIS ONLY WHEN YOU FEEL YOU HAVE A SOLID PLAN! -->
</end_phase>

</phase_prompt>
`,
};
