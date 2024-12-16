import { ConfigService } from "@services/ConfigService";
import { container } from "tsyringe";
import { UnitTestMocker } from "../../../jest/mocks/UnitTestMocker";
import { MessageContextManager } from "../context/MessageContextManager";
import { ModelManager } from "../ModelManager";
import { ModelScaler } from "../ModelScaler";
import { PhaseManager } from "../PhaseManager";
import { Phase } from "../types/PhaseTypes";

describe("ModelScaler", () => {
  let modelScaler: ModelScaler;
  let mocker: UnitTestMocker;
  let modelManagerSetCurrentModelSpy: jest.SpyInstance;
  let modelScalerHandleModelScalingSpy: jest.SpyInstance;

  beforeAll(() => {
    mocker = new UnitTestMocker();
  });

  beforeEach(() => {
    // Mock ConfigService.getConfig first
    mocker.mockPrototype(ConfigService, "getConfig", {
      autoScaler: true,
      discoveryModel: "openai/gpt-3.5-turbo",
      executeModel: "openai/gpt-4",
      strategyModel: "anthropic/claude-2",
      autoScaleAvailableModels: [
        { id: "model1", maxWriteTries: 3, maxGlobalTries: 5 },
        { id: "model2", maxWriteTries: 5, maxGlobalTries: 8 },
        { id: "model3", maxWriteTries: 7, maxGlobalTries: 10 },
      ],
    });

    // Mock MessageContextManager methods
    mocker.mockPrototype(MessageContextManager, "getTotalTokenCount", 0);
    mocker.mockPrototype(MessageContextManager, "cleanupContext", false);

    // Spy on ModelManager.setCurrentModel
    modelManagerSetCurrentModelSpy = mocker.spyPrototype(
      ModelManager,
      "setCurrentModel",
    );

    // Spy on ModelScaler.handleModelScaling
    modelScalerHandleModelScalingSpy = mocker.spyPrototype(
      ModelScaler,
      "handleModelScaling" as keyof ModelScaler,
    );

    // Resolve ModelScaler after setting up mocks
    modelScaler = container.resolve(ModelScaler);

    // Reset ModelScaler state
    modelScaler.reset();

    // Clear spy's call counts to ignore setCurrentModel called during reset
    modelManagerSetCurrentModelSpy.mockClear();
    modelScalerHandleModelScalingSpy.mockClear();
  });

  afterEach(() => {
    mocker.clearAllMocks();
  });

  it("should not auto scale a model when on Discovery phase", async () => {
    mocker.mockPrototype(PhaseManager, "getCurrentPhase", Phase.Discovery);
    await modelScaler.incrementTryCount("file1");

    expect(modelManagerSetCurrentModelSpy).not.toHaveBeenCalled();
  });

  it("should use executeModel during execute phase if <= 3 tries on the same file when autoScaler is on", async () => {
    mocker.mockPrototype(PhaseManager, "getCurrentPhase", Phase.Execute);

    await modelScaler.incrementTryCount("file1");
    await modelScaler.incrementTryCount("file1");

    expect(modelManagerSetCurrentModelSpy).not.toHaveBeenCalled();
    expect(modelScalerHandleModelScalingSpy).not.toHaveBeenCalled();
  });

  it("should handle multiple files independently in execute phase", async () => {
    mocker.mockPrototype(PhaseManager, "getCurrentPhase", Phase.Execute);

    // File 1 gets 4 tries
    await modelScaler.incrementTryCount("file1");
    await modelScaler.incrementTryCount("file1");
    await modelScaler.incrementTryCount("file1");
    await modelScaler.incrementTryCount("file1");

    // File 2 gets 2 tries
    await modelScaler.incrementTryCount("file2");
    await modelScaler.incrementTryCount("file2");

    expect(modelScaler.getTryCount("file1")).toBe(4);
    expect(modelScaler.getTryCount("file2")).toBe(2);
    expect(modelScaler.getGlobalTryCount()).toBe(6);

    // Since file1 exceeded 2 tries, handleModelScaling should have been called once
    expect(modelScalerHandleModelScalingSpy).toHaveBeenCalledTimes(2);
  });

  it("should reset to phase-specific model", () => {
    modelScaler.reset();

    expect(modelScaler.getGlobalTryCount()).toBe(0);
    expect(modelScaler.getTryCount("file1")).toBe(0);
    expect(modelManagerSetCurrentModelSpy).toHaveBeenCalledWith(
      "openai/gpt-3.5-turbo",
    );
  });

  it("should not increment try count when auto scaler is disabled", async () => {
    // Override the config to disable auto scaler
    mocker.mockPrototype(ConfigService, "getConfig", {
      autoScaler: false,
      discoveryModel: "openai/gpt-3.5-turbo",
      executeModel: "openai/gpt-4",
      strategyModel: "anthropic/claude-2",
      autoScaleAvailableModels: [
        { id: "model1", maxWriteTries: 3, maxGlobalTries: 5 },
        { id: "model2", maxWriteTries: 5, maxGlobalTries: 8 },
        { id: "model3", maxWriteTries: 7, maxGlobalTries: 10 },
      ],
    });

    // Re-initialize ModelScaler to pick up the new config
    modelScaler.reset();

    await modelScaler.incrementTryCount("file1");
    await modelScaler.incrementTryCount("file1");
    await modelScaler.incrementTryCount("file1");
    await modelScaler.incrementTryCount("file1");

    expect(modelScaler.getTryCount("file1")).toBe(0);
    expect(modelScaler.getGlobalTryCount()).toBe(0);

    // Expect setCurrentModel to have been called once during reset
    expect(modelManagerSetCurrentModelSpy).toHaveBeenCalledTimes(1);
    expect(modelManagerSetCurrentModelSpy).toHaveBeenCalledWith(
      "openai/gpt-3.5-turbo",
    );

    // Ensure no additional calls during incrementTryCount
    expect(modelScalerHandleModelScalingSpy).not.toHaveBeenCalled();
  });

  it("should handle phase transitions correctly", async () => {
    // Start in Discovery phase
    mocker.mockPrototype(PhaseManager, "getCurrentPhase", Phase.Discovery);
    await modelScaler.incrementTryCount("file1");
    expect(modelManagerSetCurrentModelSpy).not.toHaveBeenCalled();

    // Transition to Strategy phase
    mocker.mockPrototype(PhaseManager, "getCurrentPhase", Phase.Strategy);
    await modelScaler.incrementTryCount("file1");
    expect(modelManagerSetCurrentModelSpy).not.toHaveBeenCalled();

    // Transition to Execute phase
    mocker.mockPrototype(PhaseManager, "getCurrentPhase", Phase.Execute);
    await modelScaler.incrementTryCount("file1");
    await modelScaler.incrementTryCount("file1");
    await modelScaler.incrementTryCount("file1");
    await modelScaler.incrementTryCount("file1");

    expect(modelManagerSetCurrentModelSpy).toHaveBeenCalled();
  });

  describe("getModelForTryCount", () => {
    it("should return first model when tryCount is null", () => {
      const result = (modelScaler as any).getModelForTryCount(null, 0);
      expect(result).toBe("model1");
    });

    it("should scale up based on try count", () => {
      expect((modelScaler as any).getModelForTryCount("2", 0)).toBe("model1");
      expect((modelScaler as any).getModelForTryCount("4", 0)).toBe("model2");
      expect((modelScaler as any).getModelForTryCount("9", 0)).toBe("model3");
    });

    it("should scale up based on global tries", () => {
      expect((modelScaler as any).getModelForTryCount("2", 6)).toBe("model2");
      expect((modelScaler as any).getModelForTryCount("2", 9)).toBe("model3");
    });

    it("should return last model when all thresholds are exceeded", () => {
      const result = (modelScaler as any).getModelForTryCount("20", 15);
      expect(result).toBe("model3");
    });
  });
});
