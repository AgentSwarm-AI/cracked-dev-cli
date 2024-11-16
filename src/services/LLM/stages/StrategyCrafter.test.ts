import { container } from "tsyringe";
import { TagsExtractor } from "../../TagsExtractor/TagsExtractor";
import { STAGE_PROMPTS, TaskStage } from "../../TaskManager/TaskStage";
import { StrategyCrafter } from "./StrategyCrafter";

describe("StrategyCrafter", () => {
  let strategyCrafter: StrategyCrafter;
  let mockTagsExtractor: jest.Mocked<TagsExtractor>;

  beforeEach(() => {
    mockTagsExtractor = {
      extractTag: jest.fn(),
      extractTags: jest.fn(),
      extractTagLines: jest.fn(),
      extractNestedTags: jest.fn(),
    } as any;

    container.registerInstance(TagsExtractor, mockTagsExtractor);
    strategyCrafter = container.resolve(StrategyCrafter);
  });

  describe("stage management", () => {
    it("should start with DISCOVERY stage", () => {
      expect(strategyCrafter.getCurrentStage()).toBe(TaskStage.DISCOVERY);
    });

    it("should advance stage correctly", () => {
      strategyCrafter.advanceStage();
      expect(strategyCrafter.getCurrentStage()).toBe(TaskStage.STRATEGY);
    });

    it("should reset stage to DISCOVERY", () => {
      strategyCrafter.advanceStage();
      strategyCrafter.resetStage();
      expect(strategyCrafter.getCurrentStage()).toBe(TaskStage.DISCOVERY);
    });
  });

  describe("getPromptForStage", () => {
    it("should return stage-specific instructions without task or environment tags", () => {
      const task = "Test task";
      const envDetails = "Test environment";
      const result = strategyCrafter.getPromptForStage(
        TaskStage.DISCOVERY,
        task,
        envDetails,
      );

      expect(result).toBe(STAGE_PROMPTS[TaskStage.DISCOVERY]);
      expect(result).not.toContain("<task>");
      expect(result).not.toContain("<environment>");
    });

    it("should return correct prompt for each stage", () => {
      Object.values(TaskStage).forEach((stage) => {
        const result = strategyCrafter.getPromptForStage(stage, "", "");
        expect(result).toBe(STAGE_PROMPTS[stage]);
      });
    });
  });

  describe("parseStrategyResponse", () => {
    it("should parse valid strategy response", () => {
      const mockGoalContent = `
        <description>Goal 1</description>
        <steps>Step 1</steps>
        <considerations>Consider 1</considerations>
      `;

      mockTagsExtractor.extractTag
        .mockReturnValueOnce("strategy content")
        .mockReturnValueOnce("Goal 1");

      mockTagsExtractor.extractTags.mockReturnValueOnce([mockGoalContent]);
      mockTagsExtractor.extractTagLines
        .mockReturnValueOnce(["Step 1"])
        .mockReturnValueOnce(["Consider 1"]);

      const result = strategyCrafter.parseStrategyResponse(
        "<strategy>content</strategy>",
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        description: "Goal 1",
        steps: ["Step 1"],
        considerations: ["Consider 1"],
      });
    });

    it("should handle empty strategy response", () => {
      mockTagsExtractor.extractTag.mockReturnValueOnce(null);
      const result = strategyCrafter.parseStrategyResponse("");
      expect(result).toEqual([]);
    });

    it("should parse multiple goals in strategy response", () => {
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
        .mockReturnValueOnce("strategy content")
        .mockReturnValueOnce("Goal 1")
        .mockReturnValueOnce("Goal 2");

      mockTagsExtractor.extractTags.mockReturnValueOnce([
        mockGoalContent1,
        mockGoalContent2,
      ]);
      mockTagsExtractor.extractTagLines
        .mockReturnValueOnce(["Step 1A"])
        .mockReturnValueOnce(["Consider 1A"])
        .mockReturnValueOnce(["Step 2A"])
        .mockReturnValueOnce(["Consider 2A"]);

      const result = strategyCrafter.parseStrategyResponse(
        "<strategy>content</strategy>",
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        description: "Goal 1",
        steps: ["Step 1A"],
        considerations: ["Consider 1A"],
      });
      expect(result[1]).toEqual({
        description: "Goal 2",
        steps: ["Step 2A"],
        considerations: ["Consider 2A"],
      });
    });

    it("should handle malformed goal content", () => {
      const mockGoalContent = `
        <description>Goal 1</description>
        <!-- Missing steps and considerations -->
      `;

      mockTagsExtractor.extractTag
        .mockReturnValueOnce("strategy content")
        .mockReturnValueOnce("Goal 1");

      mockTagsExtractor.extractTags.mockReturnValueOnce([mockGoalContent]);
      mockTagsExtractor.extractTagLines
        .mockReturnValueOnce([])
        .mockReturnValueOnce([]);

      const result = strategyCrafter.parseStrategyResponse(
        "<strategy>content</strategy>",
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        description: "Goal 1",
        steps: [],
        considerations: [],
      });
    });
  });
});
