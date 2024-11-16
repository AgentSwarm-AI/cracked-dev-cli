import { container } from "tsyringe";
import { TagsExtractor } from "../../TagsExtractor/TagsExtractor";
import { TaskStage } from "../../TaskManager/TaskStage";
import { ActionExecutor } from "../actions/ActionExecutor";
import { LLMContextCreator } from "../LLMContextCreator";
import { DiscoveryCrafter } from "./DiscoveryCrafter";

describe("DiscoveryCrafter", () => {
  let discoveryCrafter: DiscoveryCrafter;
  let mockTagsExtractor: jest.Mocked<TagsExtractor>;
  let mockContextCreator: jest.Mocked<LLMContextCreator>;
  let mockActionExecutor: jest.Mocked<ActionExecutor>;

  beforeEach(() => {
    mockTagsExtractor = {
      extractTag: jest.fn(),
      extractTags: jest.fn(),
      extractTagLines: jest.fn(),
      extractNestedTags: jest.fn(),
    } as any;

    mockContextCreator = {
      create: jest.fn(),
      parseAndExecuteActions: jest.fn(),
    } as any;

    mockActionExecutor = {
      executeAction: jest.fn(),
    } as any;

    container.registerInstance(TagsExtractor, mockTagsExtractor);
    container.registerInstance(LLMContextCreator, mockContextCreator);
    container.registerInstance(ActionExecutor, mockActionExecutor);
    discoveryCrafter = container.resolve(DiscoveryCrafter);
  });

  describe("initiateDiscovery", () => {
    it("should create initial context with environment details", async () => {
      const task = "test task";
      const root = "/test/path";
      const expectedContext = "test context";

      mockContextCreator.create.mockResolvedValueOnce(expectedContext);

      const result = await discoveryCrafter.initiateDiscovery(task, root);

      expect(result).toBe(expectedContext);
      expect(mockContextCreator.create).toHaveBeenCalledWith(
        task,
        root,
        true,
        TaskStage.DISCOVERY,
        "",
      );
    });
  });

  describe("executeDiscoveryActions", () => {
    it("should execute file reading actions and return results", async () => {
      const response = "<read_file><path>test.ts</path></read_file>";
      const expectedActions = [
        {
          action: "read_file",
          result: {
            success: true,
            data: "file content",
          },
        },
      ];

      mockContextCreator.parseAndExecuteActions.mockResolvedValueOnce(
        expectedActions,
      );

      const result = await discoveryCrafter.executeDiscoveryActions(response);

      expect(result).toEqual(expectedActions);
      expect(mockContextCreator.parseAndExecuteActions).toHaveBeenCalledWith(
        response,
      );
    });

    it("should handle multiple file reading actions", async () => {
      const response = `
        <read_file><path>test1.ts</path></read_file>
        <read_file><path>test2.ts</path></read_file>
      `;
      const expectedActions = [
        {
          action: "read_file",
          result: {
            success: true,
            data: "content 1",
          },
        },
        {
          action: "read_file",
          result: {
            success: true,
            data: "content 2",
          },
        },
      ];

      mockContextCreator.parseAndExecuteActions.mockResolvedValueOnce(
        expectedActions,
      );

      const result = await discoveryCrafter.executeDiscoveryActions(response);

      expect(result).toEqual(expectedActions);
      expect(mockContextCreator.parseAndExecuteActions).toHaveBeenCalledWith(
        response,
      );
    });

    it("should handle failed actions", async () => {
      const response = "<read_file><path>missing.ts</path></read_file>";
      const expectedActions = [
        {
          action: "read_file",
          result: {
            success: false,
            error: new Error("File not found"),
          },
        },
      ];

      mockContextCreator.parseAndExecuteActions.mockResolvedValueOnce(
        expectedActions,
      );

      const result = await discoveryCrafter.executeDiscoveryActions(response);

      expect(result).toEqual(expectedActions);
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

      const result = discoveryCrafter.parseDiscoveryResponse(
        "<discovery>content</discovery>",
      );

      expect(result).toEqual({
        requirements: ["Req 1"],
        relevantFiles: ["File 1"],
        patterns: ["Pattern 1"],
      });
    });

    it("should handle simple file read responses", () => {
      const response = `
        <read_file><path>test.ts</path></read_file>
        Action completed successfully
        <task_objective_completed>Colors supported: cyan, yellow, green, magenta, blue</task_objective_completed>
      `;

      mockTagsExtractor.extractTag
        .mockReturnValueOnce(null) // No discovery tag
        .mockReturnValueOnce(
          "Colors supported: cyan, yellow, green, magenta, blue",
        ); // task_objective_completed tag

      const result = discoveryCrafter.parseDiscoveryResponse(response);

      expect(result).toEqual({
        requirements: [],
        relevantFiles: ["test.ts"],
        patterns: [],
      });
    });

    it("should handle empty discovery response", () => {
      mockTagsExtractor.extractTag.mockReturnValueOnce(null);

      const result = discoveryCrafter.parseDiscoveryResponse("");

      expect(result).toEqual({
        requirements: [],
        relevantFiles: [],
        patterns: [],
      });
    });
  });

  describe("isDiscoveryComplete", () => {
    it("should return true when task_objective_completed tag is present", () => {
      mockTagsExtractor.extractTag.mockReturnValueOnce("Task completed");

      const result = discoveryCrafter.isDiscoveryComplete(
        "<task_objective_completed>Task completed</task_objective_completed>",
      );

      expect(result).toBe(true);
      expect(mockTagsExtractor.extractTag).toHaveBeenCalledWith(
        expect.any(String),
        "task_objective_completed",
      );
    });

    it("should return true for simple file read with completion", () => {
      const response = `
        <read_file><path>test.ts</path></read_file>
        Action completed successfully
        <task_objective_completed>Colors found</task_objective_completed>
      `;

      mockTagsExtractor.extractTag.mockReturnValueOnce("Colors found");

      const result = discoveryCrafter.isDiscoveryComplete(response);

      expect(result).toBe(true);
    });

    it("should return false when task_objective_completed tag is not present", () => {
      mockTagsExtractor.extractTag.mockReturnValueOnce(null);

      const result = discoveryCrafter.isDiscoveryComplete("");

      expect(result).toBe(false);
      expect(mockTagsExtractor.extractTag).toHaveBeenCalledWith(
        expect.any(String),
        "task_objective_completed",
      );
    });

    it("should return false for incomplete file read", () => {
      const response = `
        <read_file><path>test.ts</path></read_file>
        Action completed successfully
      `;

      mockTagsExtractor.extractTag.mockReturnValueOnce(null);

      const result = discoveryCrafter.isDiscoveryComplete(response);

      expect(result).toBe(false);
    });
  });
});
