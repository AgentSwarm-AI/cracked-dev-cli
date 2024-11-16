import { autoInjectable } from "tsyringe";

export interface Goal {
  description: string;
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

  parseStrategy(text: string): void {
    const strategyMatch = text.match(/<strategy>([\s\S]*?)<\/strategy>/);
    if (!strategyMatch) return;

    const strategyContent = strategyMatch[1];
    const goalMatches = strategyContent.match(/<goal>([\s\S]*?)<\/goal>/g);

    if (!goalMatches) return;

    this.strategy.goals = goalMatches.map((goalTag) => ({
      description: goalTag.replace(/<\/?goal>/g, "").trim(),
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
