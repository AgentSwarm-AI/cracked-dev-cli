import { autoInjectable } from "tsyringe";
import { TagsExtractor } from "../TagsExtractor/TagsExtractor";

export interface Goal {
  description: string;
  steps: string[];
  considerations: string[];
  completed: boolean;
}

export interface Strategy {
  goals: Goal[];
  currentGoalIndex: number;
}

@autoInjectable()
export class TaskManager {
  private strategy: Strategy = {
    goals: [],
    currentGoalIndex: 0,
  };

  constructor(private tagsExtractor: TagsExtractor) {}

  parseStrategy(text: string): void {
    const strategyContent = this.tagsExtractor.extractTag(text, "strategy");
    if (!strategyContent) return;

    const goalTags = this.tagsExtractor.extractTags(strategyContent, "goal");
    if (!goalTags.length) return;

    this.strategy.goals = goalTags.map((goalContent) => ({
      description:
        this.tagsExtractor.extractTag(goalContent, "description") || "",
      steps: this.tagsExtractor.extractTagLines(goalContent, "steps"),
      considerations: this.tagsExtractor.extractTagLines(
        goalContent,
        "considerations",
      ),
      completed: false,
    }));

    this.strategy.currentGoalIndex = 0;
  }

  getCurrentGoal(): Goal | null {
    return this.strategy.goals[this.strategy.currentGoalIndex] || null;
  }

  completeCurrentGoal(): void {
    if (this.strategy.currentGoalIndex < this.strategy.goals.length) {
      this.strategy.goals[this.strategy.currentGoalIndex].completed = true;
      this.strategy.currentGoalIndex++;
    }
  }

  getAllGoals(): Goal[] {
    return this.strategy.goals;
  }

  hasRemainingGoals(): boolean {
    return this.strategy.currentGoalIndex < this.strategy.goals.length;
  }

  getProgress(): { completed: number; total: number } {
    return {
      completed: this.strategy.goals.filter((goal) => goal.completed).length,
      total: this.strategy.goals.length,
    };
  }

  reset(): void {
    this.strategy = {
      goals: [],
      currentGoalIndex: 0,
    };
  }
}
