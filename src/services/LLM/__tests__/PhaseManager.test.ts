import { ConfigService } from "@services/ConfigService";
import { UnitTestMocker } from "@tests/mocks/UnitTestMocker";
import { container } from "tsyringe";
import { ModelManager } from "../ModelManager";
import { PhaseManager } from "../PhaseManager";
import { Phase } from "../types/PhaseTypes";

describe("PhaseManager", () => {
  let phaseManager: PhaseManager;
  let mocker: UnitTestMocker;
  let configService: ConfigService;

  const baseMockConfig = {
    provider: "test-provider",
    customInstructions: "",
    interactive: false,
    stream: false,
    debug: false,
    options: "",
    openRouterApiKey: "",
    appUrl: "",
    appName: "",
    discoveryModel: "",
    strategyModel: "",
    executeModel: "",
    anthropicApiKey: "",
    openAiApiKey: "",
    directoryScanner: {
      defaultIgnore: ["dist", "coverage", ".next", "build", ".cache", ".husky"],
      maxDepth: 8,
      allFiles: true,
      directoryFirst: true,
      excludeDirectories: false,
    },
    autoScaleAvailableModels: [
      {
        id: "anthropic/claude-3.5-sonnet:beta",
        description: "Scaled model for retry attempts",
        maxWriteTries: 5,
        maxGlobalTries: 15,
      },
      {
        id: "openai/gpt-4o-2024-11-20",
        description: "Scaled model for retry attempts",
        maxWriteTries: 2,
        maxGlobalTries: 20,
      },
    ],
    referenceExamples: {}, // Added referenceExamples
  };

  beforeAll(() => {
    configService = container.resolve(ConfigService);
    phaseManager = container.resolve(PhaseManager);
    mocker = new UnitTestMocker();
  });

  beforeEach(() => {
    jest.spyOn(configService, "getConfig").mockReturnValue(baseMockConfig);
    phaseManager.initializePhaseConfigs();
  });

  afterEach(() => {
    mocker.clearAllMocks();
  });

  describe("phase transitions", () => {
    it("should start in DISCOVERY phase", () => {
      expect(phaseManager.getCurrentPhase()).toBe(Phase.Discovery);
    });

    it("should transition through phases correctly", () => {
      expect(phaseManager.getCurrentPhase()).toBe(Phase.Discovery);
      expect(phaseManager.nextPhase()).toBe(Phase.Strategy);
      expect(phaseManager.nextPhase()).toBe(Phase.Execute);
      expect(phaseManager.nextPhase()).toBe(Phase.Execute); // Should stay in EXECUTE
    });

    it("should reset to DISCOVERY phase", () => {
      phaseManager.nextPhase(); // To STRATEGY
      phaseManager.resetPhase();
      expect(phaseManager.getCurrentPhase()).toBe(Phase.Discovery);
    });

    it("should allow setting specific phase", () => {
      phaseManager.setPhase(Phase.Strategy);
      expect(phaseManager.getCurrentPhase()).toBe(Phase.Strategy);
    });
  });

  describe("phase configurations", () => {
    it("should get correct phase config", () => {
      const config = phaseManager.getCurrentPhaseConfig();
      expect(config).toBeDefined();
      expect(config.model).toBeDefined();
    });

    it("should throw error for invalid phase config", () => {
      expect(() => phaseManager.getPhaseConfig("INVALID" as Phase)).toThrow(
        "No configuration found for phase INVALID",
      );
    });
  });

  describe("model overrides", () => {
    it("should use config model override when provided", () => {
      const customConfig = {
        ...baseMockConfig,
        discoveryModel: "google/gemini-flash-1.5-8b",
        strategyModel: "anthropic/claude-3.5-sonnet:beta",
        executeModel: "qwen/qwen-2.5-coder-32b-instruct",
      };

      jest.spyOn(configService, "getConfig").mockReturnValue(customConfig);
      const modelManager = container.resolve(ModelManager);
      const customPhaseManager = new PhaseManager(configService, modelManager);
      customPhaseManager.initializePhaseConfigs();

      expect(customPhaseManager.getPhaseConfig(Phase.Discovery).model).toBe(
        "google/gemini-flash-1.5-8b",
      );
      expect(customPhaseManager.getPhaseConfig(Phase.Strategy).model).toBe(
        "anthropic/claude-3.5-sonnet:beta",
      );
      expect(customPhaseManager.getPhaseConfig(Phase.Execute).model).toBe(
        "qwen/qwen-2.5-coder-32b-instruct",
      );
    });

    it("should use default models when no override provided", () => {
      const emptyConfig = {
        ...baseMockConfig,
      };

      jest.spyOn(configService, "getConfig").mockReturnValue(emptyConfig);
      const modelManager = container.resolve(ModelManager);
      const defaultPhaseManager = new PhaseManager(configService, modelManager);
      defaultPhaseManager.initializePhaseConfigs();

      const discoveryConfig = defaultPhaseManager.getPhaseConfig(
        Phase.Discovery,
      );
      const strategyConfig = defaultPhaseManager.getPhaseConfig(Phase.Strategy);
      const executeConfig = defaultPhaseManager.getPhaseConfig(Phase.Execute);

      expect(discoveryConfig.model).toBeDefined();
      expect(strategyConfig.model).toBeDefined();
      expect(executeConfig.model).toBeDefined();
    });
  });
});
