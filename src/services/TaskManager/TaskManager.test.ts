import { container } from "tsyringe";
import { TagsExtractor } from "../TagsExtractor/TagsExtractor";
import { TaskManager } from "./TaskManager";

describe("TaskManager", () => {
  let taskManager: TaskManager;
  let mockTagsExtractor: jest.Mocked<TagsExtractor>;

  beforeEach(() => {
    mockTagsExtractor = {
      extractTag: jest.fn(),
      extractTags: jest.fn(),
      extractTagLines: jest.fn(),
      extractNestedTags: jest.fn(),
    } as any;

    container.registerInstance(TagsExtractor, mockTagsExtractor);
    taskManager = container.resolve(TaskManager);
  });

  describe("parseStrategy", () => {
    it("should parse valid strategy with single goal", () => {
      const mockGoalContent = `
        <description>Test Goal</description>
        <steps>Step 1</steps>
        <considerations>Consider 1</considerations>
      `;

      mockTagsExtractor.extractTag
        .mockReturnValueOnce("strategy content") // For strategy tag
        .mockReturnValueOnce("Test Goal"); // For description tag

      mockTagsExtractor.extractTags.mockReturnValueOnce([mockGoalContent]);
      mockTagsExtractor.extractTagLines
        .mockReturnValueOnce(["Step 1"]) // For steps
        .mockReturnValueOnce(["Consider 1"]); // For considerations

      taskManager.parseStrategy("<strategy>content</strategy>");

      const goals = taskManager.getAllGoals();
      expect(goals).toHaveLength(1);
      expect(goals[0]).toEqual({
        description: "Test Goal",
        steps: ["Step 1"],
        considerations: ["Consider 1"],
        completed: false,
      });
    });

    it("should parse valid strategy with multiple goals", () => {
      const mockGoalContent1 = `
        <description>Goal 1</description>
        <steps>Step 1A</steps>
        <considerations>Consider 1A</considerations>
      `;
      const mockGoalContent2 = `
        <description>Goal 2</description>
        <steps>Step 2A</steps>
        <considerations>Consider 2A</considerations>
      `;

      mockTagsExtractor.extractTag
        .mockReturnValueOnce("strategy content") // For strategy tag
        .mockReturnValueOnce("Goal 1") // For first description
        .mockReturnValueOnce("Goal 2"); // For second description

      mockTagsExtractor.extractTags.mockReturnValueOnce([
        mockGoalContent1,
        mockGoalContent2,
      ]);
      mockTagsExtractor.extractTagLines
        .mockReturnValueOnce(["Step 1A"]) // First goal steps
        .mockReturnValueOnce(["Consider 1A"]) // First goal considerations
        .mockReturnValueOnce(["Step 2A"]) // Second goal steps
        .mockReturnValueOnce(["Consider 2A"]); // Second goal considerations

      taskManager.parseStrategy("<strategy>content</strategy>");

      const goals = taskManager.getAllGoals();
      expect(goals).toHaveLength(2);
      expect(goals[0]).toEqual({
        description: "Goal 1",
        steps: ["Step 1A"],
        considerations: ["Consider 1A"],
        completed: false,
      });
      expect(goals[1]).toEqual({
        description: "Goal 2",
        steps: ["Step 2A"],
        considerations: ["Consider 2A"],
        completed: false,
      });
    });

    it("should handle empty strategy tag", () => {
      mockTagsExtractor.extractTag.mockReturnValueOnce(null);

      taskManager.parseStrategy("");

      expect(taskManager.getAllGoals()).toEqual([]);
    });

    it("should handle strategy with no goals", () => {
      mockTagsExtractor.extractTag.mockReturnValueOnce("strategy content");
      mockTagsExtractor.extractTags.mockReturnValueOnce([]);

      taskManager.parseStrategy("<strategy>content</strategy>");

      expect(taskManager.getAllGoals()).toEqual([]);
    });
  });

  describe("goal management", () => {
    beforeEach(() => {
      // Setup a strategy with two goals
      const mockGoalContent1 = `
        <description>Goal 1</description>
        <steps>Step 1</steps>
        <considerations>Consider 1</considerations>
      `;
      const mockGoalContent2 = `
        <description>Goal 2</description>
        <steps>Step 2</steps>
        <considerations>Consider 2</considerations>
      `;

      mockTagsExtractor.extractTag
        .mockReturnValueOnce("strategy content")
        .mockReturnValueOnce("Goal 1")
        .mockReturnValueOnce("Goal 2");

      mockTagsExtractor.extractTags.mockReturnValueOnce([
        mockGoalContent1,
        mockGoalContent2,
      ]);
      mockTagsExtractor.extractTagLines
        .mockReturnValueOnce(["Step 1"])
        .mockReturnValueOnce(["Consider 1"])
        .mockReturnValueOnce(["Step 2"])
        .mockReturnValueOnce(["Consider 2"]);

      taskManager.parseStrategy("<strategy>content</strategy>");
    });

    it("should get current goal", () => {
      const currentGoal = taskManager.getCurrentGoal();
      expect(currentGoal).toEqual({
        description: "Goal 1",
        steps: ["Step 1"],
        considerations: ["Consider 1"],
        completed: false,
      });
    });

    it("should complete current goal and advance", () => {
      taskManager.completeCurrentGoal();

      const goals = taskManager.getAllGoals();
      expect(goals[0].completed).toBe(true);
      expect(taskManager.getCurrentGoal()).toEqual({
        description: "Goal 2",
        steps: ["Step 2"],
        considerations: ["Consider 2"],
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

    it("should check remaining goals correctly", () => {
      expect(taskManager.hasRemainingGoals()).toBe(true);

      taskManager.completeCurrentGoal();
      expect(taskManager.hasRemainingGoals()).toBe(true);

      taskManager.completeCurrentGoal();
      expect(taskManager.hasRemainingGoals()).toBe(false);
    });

    it("should reset strategy state", () => {
      taskManager.completeCurrentGoal();
      taskManager.reset();

      expect(taskManager.getAllGoals()).toEqual([]);
      expect(taskManager.getCurrentGoal()).toBeNull();
      expect(taskManager.getProgress()).toEqual({ completed: 0, total: 0 });
      expect(taskManager.hasRemainingGoals()).toBe(false);
    });
  });
});
