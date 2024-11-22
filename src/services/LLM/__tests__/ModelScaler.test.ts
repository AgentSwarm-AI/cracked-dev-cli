import { ModelScaler } from "@services/LLM/ModelScaler";
import { DebugLogger } from "@services/logging/DebugLogger";
import { UnitTestMocker } from "@tests/mocks/UnitTestMocker";
import { container } from "tsyringe";

describe("ModelScaler", () => {
  let modelScaler: ModelScaler;
  let mocker: UnitTestMocker;
  let mockDebugLogger: jest.Mocked<DebugLogger>;

  beforeEach(() => {
    // Create mock DebugLogger
    mockDebugLogger = {
      log: jest.fn(),
    } as unknown as jest.Mocked<DebugLogger>;

    // Register mock DebugLogger with container
    container.registerInstance(DebugLogger, mockDebugLogger);

    mocker = container.resolve(UnitTestMocker);
    modelScaler = container.resolve(ModelScaler);
  });

  afterEach(() => {
    mocker.clearAllMocks();
    container.clearInstances();
    jest.clearAllMocks();
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

  it("should increment try count correctly", () => {
    // Initial try count
    expect(modelScaler.getTryCount("file1.ts")).toBe(0);

    // Increment try count
    modelScaler.incrementTryCount("file1.ts");
    expect(modelScaler.getTryCount("file1.ts")).toBe(1);

    // Increment again
    modelScaler.incrementTryCount("file1.ts");
    expect(modelScaler.getTryCount("file1.ts")).toBe(2);
  });

  it("should log correctly on initialization", () => {
    expect(mockDebugLogger.log).toHaveBeenCalledWith(
      "Model",
      "Initialized model scaler",
      {
        model: "qwen/qwen-2.5-coder-32b-instruct",
      },
    );
  });

  it("should log correctly on model update", () => {
    modelScaler.setTryCount("file1.ts", 2);
    expect(mockDebugLogger.log).toHaveBeenCalledWith(
      "Model",
      "Updated model based on file try count",
      {
        filePath: "file1.ts",
        tryCount: 2,
        maxTries: 2,
        model: "anthropic/claude-3.5-sonnet:beta",
      },
    );
  });

  it("should log correctly on reset", () => {
    modelScaler.reset();
    expect(mockDebugLogger.log).toHaveBeenCalledWith(
      "Model",
      "Reset model scaling",
      {
        model: "qwen/qwen-2.5-coder-32b-instruct",
      },
    );
  });
});
