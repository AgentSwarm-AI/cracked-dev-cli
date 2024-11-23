import { EndTaskAction } from "@services/LLM/actions/EndTaskAction";
import { ActionTagsExtractor } from "@services/LLM/actions/ActionTagsExtractor";
import { UnitTestMocker } from "@tests/mocks/UnitTestMocker";
import { container } from "tsyringe";

describe("EndTaskAction", () => {
  let endTaskAction: EndTaskAction;
  let mocker: UnitTestMocker;
  let consoleLogSpy: jest.SpyInstance;

  beforeAll(() => {
    endTaskAction = container.resolve(EndTaskAction);
  });

  beforeEach(() => {
    mocker = new UnitTestMocker();

    // Setup spies on prototype methods of dependencies
    mocker.spyOnPrototype(ActionTagsExtractor, "extractTag", jest.fn());

    // Mock console.log
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    mocker.clearAllMocks();
    consoleLogSpy.mockRestore();
  });

  describe("tag validation", () => {
    it("should detect missing message tag", async () => {
      const content = "<end_task></end_task>";
      (endTaskAction as any).actionTagsExtractor.extractTag.mockReturnValue(null);

      const result = await endTaskAction.execute(content);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain(
        "Invalid end_task format. Must include <message> tag.",
      );
    });

    it("should accept properly formatted tags", async () => {
      const content = "<end_task><message>Task completed</message></end_task>";
      (endTaskAction as any).actionTagsExtractor.extractTag.mockReturnValue(
        "Task completed",
      );

      const result = await endTaskAction.execute(content);

      expect(result.success).toBe(true);
      expect(result.data).toBe("Task completed");
      expect(consoleLogSpy).toHaveBeenCalledWith("📝 End task message: Task completed");
    });

    it("should handle invalid tag structure", async () => {
      const content = "end_task Task completed end_task";
      (endTaskAction as any).actionTagsExtractor.extractTag.mockReturnValue(null);

      const result = await endTaskAction.execute(content);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain(
        "Invalid end_task format. Must include <message> tag.",
      );
    });
  });

  describe("execution", () => {
    it("should execute with valid message", async () => {
      const content = "<end_task><message>Task completed</message></end_task>";
      (endTaskAction as any).actionTagsExtractor.extractTag.mockReturnValue(
        "Task completed",
      );

      const result = await endTaskAction.execute(content);

      expect(result.success).toBe(true);
      expect(result.data).toBe("Task completed");
      expect(consoleLogSpy).toHaveBeenCalledWith("📝 End task message: Task completed");
    });

    it("should handle missing message tag gracefully", async () => {
      const content = "<end_task></end_task>";
      (endTaskAction as any).actionTagsExtractor.extractTag.mockReturnValue(null);

      const result = await endTaskAction.execute(content);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain(
        "Invalid end_task format. Must include <message> tag.",
      );
    });
  });
});