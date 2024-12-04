import { ConfigService } from "@services/ConfigService";
import { UnitTestMocker } from "@tests/mocks/UnitTestMocker";
import { container } from "tsyringe";
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
  };

  beforeAll(() => {
    configService = container.resolve(ConfigService);
    phaseManager = container.resolve(PhaseManager);
  });

  beforeEach(() => {
    mocker = new UnitTestMocker();
  });

  afterEach(() => {
    mocker.clearAllMocks();
  });

  describe("phase transitions", () => {
    it("should start in DISCOVERY phase", () => {
      expect(phaseManager.getCurrentPhase()).toBe(Phase.DISCOVERY);
    });

    it("should transition through phases correctly", () => {
      expect(phaseManager.getCurrentPhase()).toBe(Phase.DISCOVERY);
      expect(phaseManager.nextPhase()).toBe(Phase.STRATEGY);
      expect(phaseManager.nextPhase()).toBe(Phase.EXECUTE);
      expect(phaseManager.nextPhase()).toBe(Phase.EXECUTE); // Should stay in EXECUTE
    });

    it("should reset to DISCOVERY phase", () => {
      phaseManager.nextPhase(); // To STRATEGY
      phaseManager.resetPhase();
      expect(phaseManager.getCurrentPhase()).toBe(Phase.DISCOVERY);
    });

    it("should allow setting specific phase", () => {
      phaseManager.setPhase(Phase.STRATEGY);
      expect(phaseManager.getCurrentPhase()).toBe(Phase.STRATEGY);
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
        discoveryModel: "custom-model",
        strategyModel: "custom-strategy-model",
        executeModel: "custom-execute-model",
      };

      jest.spyOn(configService, "getConfig").mockReturnValue(customConfig);

      const customPhaseManager = new PhaseManager(configService);

      expect(customPhaseManager.getPhaseConfig(Phase.DISCOVERY).model).toBe(
        "custom-model",
      );
      expect(customPhaseManager.getPhaseConfig(Phase.STRATEGY).model).toBe(
        "custom-strategy-model",
      );
      expect(customPhaseManager.getPhaseConfig(Phase.EXECUTE).model).toBe(
        "custom-execute-model",
      );
    });

    it("should use default models when no override provided", () => {
      const emptyConfig = {
        ...baseMockConfig
      };

      jest.spyOn(configService, "getConfig").mockReturnValue(emptyConfig);

      const defaultPhaseManager = new PhaseManager(configService);

      const discoveryConfig = defaultPhaseManager.getPhaseConfig(
        Phase.DISCOVERY,
      );
      const strategyConfig = defaultPhaseManager.getPhaseConfig(Phase.STRATEGY);
      const executeConfig = defaultPhaseManager.getPhaseConfig(Phase.EXECUTE);

      expect(discoveryConfig.model).toBeDefined();
      expect(strategyConfig.model).toBeDefined();
      expect(executeConfig.model).toBeDefined();
    });
  });
});