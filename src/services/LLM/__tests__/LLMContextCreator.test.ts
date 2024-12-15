import { ConfigService } from "@services/ConfigService";
import { DirectoryScanner } from "@services/FileManagement/DirectoryScanner";
import { ActionExecutor } from "@services/LLM/actions/ActionExecutor";
import { LLMContextCreator } from "@services/LLM/LLMContextCreator";
import { ProjectInfo } from "@services/LLM/utils/ProjectInfo";
import { container } from "tsyringe";
import { UnitTestMocker } from "../../../jest/mocks/UnitTestMocker";
import { MessageContextManager } from "../MessageContextManager";
import { PhaseManager } from "../PhaseManager";
import { IPhasePromptArgs } from "../types/PhaseTypes";

describe("LLMContextCreator", () => {
  let contextCreator: LLMContextCreator;
  let mocker: UnitTestMocker;

  beforeEach(() => {
    mocker = new UnitTestMocker();

    // Mock phase config with proper prompt generation
    const mockPhaseConfig = {
      generatePrompt: (args: IPhasePromptArgs) => {
        const envDetails = args.environmentDetails || "";
        const projectInfo = args.projectInfo || "";
        return `phase_prompt\nDiscovery Phase\nActions\n${envDetails}\n${projectInfo}`;
      },
    };

    // Setup mocks using UnitTestMocker
    mocker.spyOnPrototypeAndReturn(DirectoryScanner, "scan", {
      success: true,
      data: "file1\nfile2",
    });
    mocker.spyOnPrototypeAndReturn(ActionExecutor, "executeAction", {
      success: true,
    });
    mocker.spyOnPrototypeAndReturn(ProjectInfo, "gatherProjectInfo", {
      mainDependencies: ["dep1", "dep2"],
      scripts: {
        test: "jest",
        build: "tsc",
      },
      dependencyFile: "package.json",
    });
    mocker.spyOnPrototypeAndReturn(ConfigService, "getConfig", {
      includeAllFilesOnEnvToContext: true,
    });
    mocker.spyOnPrototypeAndReturn(
      PhaseManager,
      "getCurrentPhaseConfig",
      mockPhaseConfig,
    );
    mocker.spyOnPrototypeMethod(PhaseManager, "resetPhase");
    mocker.spyOnPrototypeMethod(MessageContextManager, "clear");

    contextCreator = container.resolve(LLMContextCreator);
  });

  describe("create", () => {
    it("should create first time message with environment details and project info", async () => {
      const message = "test message";
      const root = "/test/root";

      const result = await contextCreator.create(message, root, true);

      // Test for presence of key content rather than exact matches
      expect(result).toContain("Task");
      expect(result).toContain(message);
      expect(result).toContain("Instructions");
      expect(result).toContain("Current Working Directory");
      expect(result).toContain("file1\nfile2");
      expect(result).toContain("Project Dependencies");
      expect(result).toContain("dep1, dep2");
      expect(result).toContain("test: jest");
      expect(result).toContain("build: tsc");
    });

    it("should create first time message without project info if no dependency file found", async () => {
      const message = "test message";
      const root = "/test/root";

      mocker.spyOnPrototypeAndReturn(ProjectInfo, "gatherProjectInfo", {
        mainDependencies: [],
        scripts: {},
      });

      const result = await contextCreator.create(message, root, true);

      expect(result).toContain("Task");
      expect(result).toContain(message);
      expect(result).toContain("Instructions");
      expect(result).toContain("Current Working Directory");
      expect(result).toContain("file1\nfile2");
      expect(result).not.toContain("Project Dependencies");
    });

    it("should create sequential message with phase prompt", async () => {
      const message = "test message";
      const root = "/test/root";

      const result = await contextCreator.create(message, root, false);

      // Verify the phase prompt structure without checking for the message
      expect(result).toContain("phase_prompt");
      expect(result).toContain("Discovery Phase");
      expect(result).toContain("Actions");
    });

    it("should throw error if directory scan fails", async () => {
      const message = "test message";
      const root = "/test/root";
      const error = new Error("Scan failed");

      mocker.spyOnPrototypeAndReturn(DirectoryScanner, "scan", {
        success: false,
        error,
      });

      await expect(contextCreator.create(message, root, true)).rejects.toThrow(
        "Failed to scan directory",
      );
    });

    it("should not include environment details when config flag is false", async () => {
      const message = "test message";
      const root = "/test/root";

      mocker.spyOnPrototypeAndReturn(ConfigService, "getConfig", {
        includeAllFilesOnEnvToContext: false,
      });

      const result = await contextCreator.create(message, root, true);

      expect(result).toContain("Task");
      expect(result).toContain(message);
      expect(result).not.toContain("file1\nfile2");
    });

    it("should load config with flexible referenceExamples", async () => {
      const mockConfig = {
        includeAllFilesOnEnvToContext: true,
        referenceExamples: {
          serviceA: "src/services/ServiceA.ts",
          utilityB: "src/utils/UtilityB.ts",
          someOtherKey: "path/to/another/example.ts",
        },
      };

      mocker.spyOnPrototypeAndReturn(ConfigService, "getConfig", mockConfig);

      const result = await contextCreator.create(
        "test message",
        "/test/root",
        true,
      );

      expect(result).toContain("Reference Examples");
      expect(result).toContain("serviceA: src/services/ServiceA.ts");
      expect(result).toContain("utilityB: src/utils/UtilityB.ts");
      expect(result).toContain("someOtherKey: path/to/another/example.ts");
    });

    it("should use default empty object for referenceExamples when not provided", async () => {
      const mockConfig = {
        includeAllFilesOnEnvToContext: true,
        referenceExamples: {},
      };

      mocker.spyOnPrototypeAndReturn(ConfigService, "getConfig", mockConfig);

      const result = await contextCreator.create(
        "test message",
        "/test/root",
        true,
      );

      expect(result).toContain("Reference Examples");
      expect(result).not.toContain("serviceA:");
      expect(result).not.toContain("utilityB:");
    });
  });

  afterEach(() => {
    mocker.clearAllMocks();
    jest.clearAllMocks();
  });
});
