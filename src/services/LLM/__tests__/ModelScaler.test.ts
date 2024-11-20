import { DebugLogger } from "../../logging/DebugLogger";
import { ModelScaler } from "../ModelScaler";

jest.mock("../../logging/DebugLogger");

describe("ModelScaler", () => {
  let modelScaler: ModelScaler;
  let mockDebugLogger: jest.Mocked<DebugLogger>;

  beforeEach(() => {
    mockDebugLogger = new DebugLogger() as jest.Mocked<DebugLogger>;
    mockDebugLogger.log.mockImplementation(() => {});
    modelScaler = new ModelScaler(mockDebugLogger);
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
});
