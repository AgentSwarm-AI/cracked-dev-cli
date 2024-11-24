import { EndTaskAction } from "@services/LLM/actions/EndTaskAction";
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

    // Mock console.log
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    mocker.clearAllMocks();
    consoleLogSpy.mockRestore();
  });

  describe("tag validation", () => {
    it("should detect missing message", async () => {
      const content = "<end_task></end_task>";

      const result = await endTaskAction.execute(content);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("No message provided");
    });

    it("should accept properly formatted tags", async () => {
      const content = "<end_task>Task completed</end_task>";

      const result = await endTaskAction.execute(content);

      expect(result.success).toBe(true);
      expect(result.data).toBe("Task completed");

      expect(consoleLogSpy).toHaveBeenCalledWith(
        "ℹ️ end_task: End task message: Task completed",
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "✅ end_task: Action executed successfully",
      );
    });

    it("should handle invalid tag structure", async () => {
      const content = "end_task Task completed end_task";

      const result = await endTaskAction.execute(content);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("No message provided");
    });
  });

  describe("execution", () => {
    it("should execute with valid message", async () => {
      const content = "<end_task>Task completed</end_task>";

      const result = await endTaskAction.execute(content);

      expect(result.success).toBe(true);
      expect(result.data).toBe("Task completed");

      expect(consoleLogSpy).toHaveBeenCalledWith(
        "ℹ️ end_task: End task message: Task completed",
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "✅ end_task: Action executed successfully",
      );
    });

    it("should handle empty content gracefully", async () => {
      const content = "<end_task></end_task>";

      const result = await endTaskAction.execute(content);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("No message provided");
    });
  });
});
