export enum TaskStage {
  DISCOVERY = "DISCOVERY",
  STRATEGY = "STRATEGY",
  EXECUTION = "EXECUTION",
  VERIFICATION = "VERIFICATION",
}

export interface TaskStageConfig {
  stage: TaskStage;
  prompt: string;
}

export const STAGE_PROMPTS: Record<TaskStage, string> = {
  [TaskStage.DISCOVERY]: `
Your task is to analyze the initial request and environment details to understand the scope of work.
Focus on identifying:
1. Key requirements from the task
2. Relevant parts of the codebase
3. Potential dependencies or patterns to consider

Respond with:
<discovery>
  <requirements>List key requirements here</requirements>
  <relevant_files>List files that need to be examined</relevant_files>
  <patterns>List relevant patterns or dependencies</patterns>
</discovery>
`,
  [TaskStage.STRATEGY]: `
Based on the discovery phase, craft a detailed strategy for completing the task.
Your strategy should include:
1. Clear, achievable goals
2. Specific steps for each goal
3. Potential challenges and considerations

Respond with:
<strategy>
  <goal>
    <description>Goal description</description>
    <steps>
      <step>Specific step</step>
      <!-- More steps as needed -->
    </steps>
    <considerations>Important considerations</considerations>
  </goal>
  <!-- More goals as needed -->
</strategy>
`,
  [TaskStage.EXECUTION]: `Execution stage prompt will be implemented later`,
  [TaskStage.VERIFICATION]: `Verification stage prompt will be implemented later`,
};
