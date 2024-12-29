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
    provider: "open-router",
    projectLanguage: "typescript",
    packageManager: "yarn",
    customInstructions: "Follow clean code principles",
    interactive: true,
    stream: true,
    debug: false,
    options: "temperature=0",
    openRouterApiKey: "test-key",
    appUrl: "https://localhost:8080",
    appName: "TestApp",
    discoveryModel: "model1",
    strategyModel: "model2",
    executeModel: "model3",
    autoScaler: false,
    autoScaleMaxTryPerModel: 2,
    includeAllFilesOnEnvToContext: false,
    autoScaleAvailableModels: [
      {
        id: "model1",
        description: "Test model 1",
        maxWriteTries: 5,
        maxGlobalTries: 10,
      },
    ],
    directoryScanner: {
      defaultIgnore: ["dist"],
      maxDepth: 8,
      allFiles: true,
      directoryFirst: true,
      excludeDirectories: false,
    },
    gitDiff: {
      excludeLockFiles: true,
      lockFiles: ["package-lock.json"],
    },
    referenceExamples: {},
    timeoutSeconds: 0,
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
        discoveryModel: "custom-model1",
        strategyModel: "custom-model2",
        executeModel: "custom-model3",
        projectLanguage: "typescript",
        packageManager: "yarn",
        provider: "open-router",
        customInstructions: "Follow clean code principles",
        interactive: true,
        stream: true,
        debug: false,
        options: "temperature=0",
        openRouterApiKey: "test-key",
        appUrl: "https://localhost:8080",
        appName: "TestApp",
        autoScaler: false,
        autoScaleMaxTryPerModel: 2,
        includeAllFilesOnEnvToContext: false,
        autoScaleAvailableModels: [
          {
            id: "model1",
            description: "Test model 1",
            maxWriteTries: 5,
            maxGlobalTries: 10,
          },
        ],
        directoryScanner: {
          defaultIgnore: ["dist"],
          maxDepth: 8,
          allFiles: true,
          directoryFirst: true,
          excludeDirectories: false,
        },
        gitDiff: {
          excludeLockFiles: true,
          lockFiles: ["package-lock.json"],
        },
        referenceExamples: {},
        timeoutSeconds: 0,
      };

      jest.spyOn(configService, "getConfig").mockReturnValue(customConfig);
      const modelManager = container.resolve(ModelManager);
      const customPhaseManager = new PhaseManager(configService, modelManager);
      customPhaseManager.initializePhaseConfigs();

      expect(customPhaseManager.getPhaseConfig(Phase.Discovery).model).toBe(
        "custom-model1",
      );
      expect(customPhaseManager.getPhaseConfig(Phase.Strategy).model).toBe(
        "custom-model2",
      );
      expect(customPhaseManager.getPhaseConfig(Phase.Execute).model).toBe(
        "custom-model3",
      );
    });

    it("should use default models when no override provided", () => {
      const emptyConfig = {
        provider: "open-router",
        projectLanguage: "typescript",
        packageManager: "yarn",
        customInstructions: "Follow clean code principles",
        interactive: true,
        stream: true,
        debug: false,
        options: "temperature=0",
        openRouterApiKey: "test-key",
        appUrl: "https://localhost:8080",
        appName: "TestApp",
        discoveryModel: "model1",
        strategyModel: "model2",
        executeModel: "model3",
        autoScaler: false,
        autoScaleMaxTryPerModel: 2,
        includeAllFilesOnEnvToContext: false,
        autoScaleAvailableModels: [
          {
            id: "model1",
            description: "Test model 1",
            maxWriteTries: 5,
            maxGlobalTries: 10,
          },
        ],
        directoryScanner: {
          defaultIgnore: ["dist"],
          maxDepth: 8,
          allFiles: true,
          directoryFirst: true,
          excludeDirectories: false,
        },
        gitDiff: {
          excludeLockFiles: true,
          lockFiles: ["package-lock.json"],
        },
        referenceExamples: {},
        timeoutSeconds: 0,
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
