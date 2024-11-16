import { autoInjectable, inject } from "tsyringe";
import { TagsExtractor } from "../TagsExtractor/TagsExtractor";
import { STAGE_PROMPTS, TaskStage } from "../TaskManager/TaskStage";

export interface StrategyGoal {
  description: string;
  steps: string[];
  considerations: string[];
}

@autoInjectable()
export class StrategyCrafter {
  private currentStage: TaskStage = TaskStage.DISCOVERY;

  constructor(@inject(TagsExtractor) private tagsExtractor: TagsExtractor) {}

  getPromptForStage(
    stage: TaskStage,
    task: string,
    environmentDetails: string,
  ): string {
    // Return only the stage-specific instructions
    return STAGE_PROMPTS[stage];
  }

  getCurrentStage(): TaskStage {
    return this.currentStage;
  }

  advanceStage(): void {
    const stages = Object.values(TaskStage);
    const currentIndex = stages.indexOf(this.currentStage);
    if (currentIndex < stages.length - 1) {
      this.currentStage = stages[currentIndex + 1];
    }
  }

  resetStage(): void {
    this.currentStage = TaskStage.DISCOVERY;
  }

  parseStrategyResponse(response: string): StrategyGoal[] {
    const strategyContent = this.tagsExtractor.extractTag(response, "strategy");
    if (!strategyContent) return [];

    const goals = this.tagsExtractor.extractTags(strategyContent, "goal");

    return goals.map((goalContent) => ({
      description:
        this.tagsExtractor.extractTag(goalContent, "description") || "",
      steps: this.tagsExtractor.extractTagLines(goalContent, "steps"),
      considerations: this.tagsExtractor.extractTagLines(
        goalContent,
        "considerations",
      ),
    }));
  }
}
