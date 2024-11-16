import { container } from "tsyringe";
import { TaskManager } from "./TaskManager";

describe("TaskManager", () => {
  let taskManager: TaskManager;

  beforeEach(() => {
    taskManager = container.resolve(TaskManager);
  });

  describe("parseStrategy", () => {
    it("should parse strategy and goals from text", () => {
      const text = `
        <strategy>
          <goal>First goal</goal>
          <goal>Second goal</goal>
          <goal>Third goal</goal>
        </strategy>
      `;

      taskManager.parseStrategy(text);
      const goals = taskManager.getAllGoals();

      expect(goals).toHaveLength(3);
      expect(goals[0]).toEqual({ description: "First goal", completed: false });
      expect(goals[1]).toEqual({
        description: "Second goal",
        completed: false,
      });
      expect(goals[2]).toEqual({ description: "Third goal", completed: false });
    });

    it("should handle empty or invalid strategy text", () => {
      taskManager.parseStrategy("");
      expect(taskManager.getAllGoals()).toHaveLength(0);

      taskManager.parseStrategy("<strategy></strategy>");
      expect(taskManager.getAllGoals()).toHaveLength(0);
    });
  });

  describe("goal management", () => {
    beforeEach(() => {
      const text = `
        <strategy>
          <goal>First goal</goal>
          <goal>Second goal</goal>
        </strategy>
      `;
      taskManager.parseStrategy(text);
    });

    it("should get current goal", () => {
      const currentGoal = taskManager.getCurrentGoal();
      expect(currentGoal).toEqual({
        description: "First goal",
        completed: false,
      });
    });

    it("should complete current goal and move to next", () => {
      taskManager.completeCurrentGoal();

      const goals = taskManager.getAllGoals();
      expect(goals[0].completed).toBe(true);

      const currentGoal = taskManager.getCurrentGoal();
      expect(currentGoal).toEqual({
        description: "Second goal",
        completed: false,
      });
    });

    it("should track progress correctly", () => {
      expect(taskManager.getProgress()).toEqual({ completed: 0, total: 2 });

      taskManager.completeCurrentGoal();
      expect(taskManager.getProgress()).toEqual({ completed: 1, total: 2 });

      taskManager.completeCurrentGoal();
      expect(taskManager.getProgress()).toEqual({ completed: 2, total: 2 });
    });

    it("should reset state correctly", () => {
      taskManager.completeCurrentGoal();
      taskManager.reset();

      expect(taskManager.getAllGoals()).toHaveLength(0);
      expect(taskManager.getCurrentGoal()).toBeNull();
      expect(taskManager.getProgress()).toEqual({ completed: 0, total: 0 });
    });

    it("should handle completing all goals", () => {
      taskManager.completeCurrentGoal();
      taskManager.completeCurrentGoal();

      expect(taskManager.hasRemainingGoals()).toBe(false);
      expect(taskManager.getCurrentGoal()).toBeNull();
    });
  });
});
