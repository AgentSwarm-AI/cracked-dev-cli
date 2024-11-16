import { container } from "tsyringe";
import { TagsExtractor } from "../TagsExtractor/TagsExtractor";
import { STAGE_PROMPTS, TaskStage } from "../TaskManager/TaskStage";
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

      // Should only return the stage prompt without wrapping tags
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

  describe("parseDiscoveryResponse", () => {
    it("should parse valid discovery response", () => {
      const mockDiscoveryContent = `
        <requirements>Req 1</requirements>
        <relevant_files>File 1</relevant_files>
        <patterns>Pattern 1</patterns>
      `;

      mockTagsExtractor.extractTag.mockReturnValueOnce(mockDiscoveryContent);
      mockTagsExtractor.extractTagLines
        .mockReturnValueOnce(["Req 1"])
        .mockReturnValueOnce(["File 1"])
        .mockReturnValueOnce(["Pattern 1"]);

      const result = strategyCrafter.parseDiscoveryResponse(
        "<discovery>content</discovery>",
      );

      expect(result).toEqual({
        requirements: ["Req 1"],
        relevantFiles: ["File 1"],
        patterns: ["Pattern 1"],
      });

      expect(mockTagsExtractor.extractTag).toHaveBeenCalledWith(
        expect.any(String),
        "discovery",
      );
      expect(mockTagsExtractor.extractTagLines).toHaveBeenCalledTimes(3);
    });

    it("should handle empty discovery response", () => {
      mockTagsExtractor.extractTag.mockReturnValueOnce(null);

      const result = strategyCrafter.parseDiscoveryResponse("");

      expect(result).toEqual({
        requirements: [],
        relevantFiles: [],
        patterns: [],
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
        .mockReturnValueOnce("strategy content") // For strategy tag
        .mockReturnValueOnce("Goal 1"); // For description tag

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
  });
});
