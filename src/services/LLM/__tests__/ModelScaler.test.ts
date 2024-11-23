import { ModelScaler } from "@services/LLM/ModelScaler";
import { DebugLogger } from "@services/logging/DebugLogger";
import { UnitTestMocker } from "@tests/mocks/UnitTestMocker";
import { container } from "tsyringe";

describe("ModelScaler", () => {
  let modelScaler: ModelScaler;
  let mocker: UnitTestMocker;

  beforeAll(() => {
    container.register("DebugLogger", { useValue: DebugLogger });
  });

  beforeEach(() => {
    mocker = new UnitTestMocker();

    // Setup spies on prototype methods of dependencies
    mocker.spyOnPrototype(DebugLogger, "log", jest.fn());

    // Instantiate ModelScaler after setting up mocks
    modelScaler = container.resolve(ModelScaler);
    // Enable auto scaler for tests
    modelScaler.setAutoScaler(true);
  });

  afterEach(() => {
    mocker.clearAllMocks();
  });

  it("should scale models based on try count", () => {
    // Initial model
    const initialModel = modelScaler.getCurrentModel();
    expect(initialModel).toBe("qwen/qwen-2.5-coder-32b-instruct");

    // First try - still base model
    modelScaler.setTryCount("file1.ts", 1);
    expect(modelScaler.getCurrentModel()).toBe(
      "qwen/qwen-2.5-coder-32b-instruct",
    );

    // Second try - should scale up to Claude
    modelScaler.setTryCount("file1.ts", 2);
    expect(modelScaler.getCurrentModel()).toBe(
      "anthropic/claude-3.5-sonnet:beta",
    );

    // Third try - still Claude
    modelScaler.setTryCount("file1.ts", 3);
    expect(modelScaler.getCurrentModel()).toBe(
      "anthropic/claude-3.5-sonnet:beta",
    );
  });

  it("should handle multiple files and use highest try count", () => {
    // Set try counts for multiple files
    modelScaler.setTryCount("file1.ts", 1);
    expect(modelScaler.getCurrentModel()).toBe(
      "qwen/qwen-2.5-coder-32b-instruct",
    );

    // Second file hits threshold - should scale up
    modelScaler.setTryCount("file2.ts", 2);
    expect(modelScaler.getCurrentModel()).toBe(
      "anthropic/claude-3.5-sonnet:beta",
    );

    // First file stays at lower count
    expect(modelScaler.getTryCount("file1.ts")).toBe(1);
    expect(modelScaler.getTryCount("file2.ts")).toBe(2);
  });

  it("should reset model scaling", () => {
    // Set up some try counts
    modelScaler.setTryCount("file1.ts", 2);
    expect(modelScaler.getCurrentModel()).toBe(
      "anthropic/claude-3.5-sonnet:beta",
    );

    // Reset
    modelScaler.reset();
    expect(modelScaler.getCurrentModel()).toBe(
      "qwen/qwen-2.5-coder-32b-instruct",
    );
    expect(modelScaler.getTryCount("file1.ts")).toBe(0);
  });

  it("should handle edge cases for try count", () => {
    // Zero tries
    modelScaler.setTryCount("file1.ts", 0);
    expect(modelScaler.getCurrentModel()).toBe(
      "qwen/qwen-2.5-coder-32b-instruct",
    );

    // Negative tries
    modelScaler.setTryCount("file1.ts", -1);
    expect(modelScaler.getCurrentModel()).toBe(
      "qwen/qwen-2.5-coder-32b-instruct",
    );

    // Large number of tries
    modelScaler.setTryCount("file1.ts", 100);
    expect(modelScaler.getCurrentModel()).toBe("openai/o1-mini");
  });

  it("should handle concurrent scaling requests", () => {
    // Simulate concurrent requests
    modelScaler.setTryCount("file1.ts", 1);
    modelScaler.setTryCount("file2.ts", 2);
    modelScaler.setTryCount("file3.ts", 3);

    expect(modelScaler.getCurrentModel()).toBe(
      "anthropic/claude-3.5-sonnet:beta",
    );

    // Reset
    modelScaler.reset();
    expect(modelScaler.getCurrentModel()).toBe(
      "qwen/qwen-2.5-coder-32b-instruct",
    );
  });

  it("should handle invalid file names", () => {
    // Invalid file name
    modelScaler.setTryCount("", 2);
    expect(modelScaler.getCurrentModel()).toBe(
      "anthropic/claude-3.5-sonnet:beta",
    );

    // Invalid file name
    modelScaler.setTryCount(null as any, 2);
    expect(modelScaler.getCurrentModel()).toBe(
      "anthropic/claude-3.5-sonnet:beta",
    );

    // Invalid file name
    modelScaler.setTryCount(undefined as any, 2);
    expect(modelScaler.getCurrentModel()).toBe(
      "anthropic/claude-3.5-sonnet:beta",
    );
  });

  it("should disable auto scaler and reset try counts", () => {
    // Enable auto scaler
    modelScaler.setAutoScaler(true);
    modelScaler.setTryCount("file1.ts", 2);
    expect(modelScaler.getCurrentModel()).toBe(
      "anthropic/claude-3.5-sonnet:beta",
    );

    // Disable auto scaler
    modelScaler.setAutoScaler(false);
    expect(modelScaler.getCurrentModel()).toBe(
      "qwen/qwen-2.5-coder-32b-instruct",
    );
    expect(modelScaler.getTryCount("file1.ts")).toBe(0);
  });

  it("should not scale models when auto scaler is disabled", () => {
    // Disable auto scaler
    modelScaler.setAutoScaler(false);

    // Set try count
    modelScaler.setTryCount("file1.ts", 2);
    expect(modelScaler.getCurrentModel()).toBe(
      "qwen/qwen-2.5-coder-32b-instruct",
    );

    // Enable auto scaler
    modelScaler.setAutoScaler(true);
    expect(modelScaler.getCurrentModel()).toBe(
      "qwen/qwen-2.5-coder-32b-instruct",
    );
  });

  it("should increment try count for a file", () => {
    // Initial try count
    expect(modelScaler.getTryCount("file1.ts")).toBe(0);

    // Increment try count
    modelScaler.incrementTryCount("file1.ts");
    expect(modelScaler.getTryCount("file1.ts")).toBe(1);

    // Increment again
    modelScaler.incrementTryCount("file1.ts");
    expect(modelScaler.getTryCount("file1.ts")).toBe(2);
  });

  it("should not increment try count when auto scaler is disabled", () => {
    // Disable auto scaler
    modelScaler.setAutoScaler(false);

    // Increment try count
    modelScaler.incrementTryCount("file1.ts");
    expect(modelScaler.getTryCount("file1.ts")).toBe(0);
  });

  it("should increment global try count for any action", () => {
    // Initial global try count
    expect(modelScaler["globalTryCount"]).toBe(0);

    // Increment try count for a file
    modelScaler.incrementTryCount("file1.ts");
    expect(modelScaler["globalTryCount"]).toBe(1);

    // Increment try count for another file
    modelScaler.incrementTryCount("file2.ts");
    expect(modelScaler["globalTryCount"]).toBe(2);
  });

  it("should scale models based on global try count", () => {
    // Initial model
    const initialModel = modelScaler.getCurrentModel();
    expect(initialModel).toBe("qwen/qwen-2.5-coder-32b-instruct");

    // Increment global try count until it reaches the threshold for the next model
    for (let i = 0; i < 5; i++) {
      modelScaler.incrementTryCount(`file${i}.ts`);
    }
    expect(modelScaler.getCurrentModel()).toBe(
      "anthropic/claude-3.5-sonnet:beta",
    );

    // Increment global try count until it reaches the threshold for the next model
    for (let i = 5; i < 10; i++) {
      modelScaler.incrementTryCount(`file${i}.ts`);
    }
    expect(modelScaler.getCurrentModel()).toBe("openai/gpt-4o-2024-11-20");

    // Increment global try count until it reaches the threshold for the final model
    for (let i = 10; i < 15; i++) {
      modelScaler.incrementTryCount(`file${i}.ts`);
    }
    expect(modelScaler.getCurrentModel()).toBe("openai/o1-mini");
  });
});