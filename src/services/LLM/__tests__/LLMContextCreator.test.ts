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
import * as fs from "fs";

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

  describe("loadCustomInstructions", () => {
    it("should load custom instructions from file when path is provided", async () => {
      const customInstructions = "Custom instructions from file";
      mocker.spyOnPrototypeAndReturn(ConfigService, "getConfig", {
        customInstructionsPath: "/path/to/instructions",
        customInstructions: "Fallback instructions",
      });

      jest
        .spyOn(fs.promises, "readFile")
        .mockResolvedValueOnce(customInstructions);

      // @ts-ignore - accessing private method for testing
      const result = await contextCreator["loadCustomInstructions"]();

      expect(result).toBe(customInstructions);
      expect(fs.promises.readFile).toHaveBeenCalledWith(
        "/path/to/instructions",
        "utf-8",
      );
    });

    it("should fallback to config.customInstructions when file read fails", async () => {
      const fallbackInstructions = "Fallback instructions";
      mocker.spyOnPrototypeAndReturn(ConfigService, "getConfig", {
        customInstructionsPath: "/path/to/instructions",
        customInstructions: fallbackInstructions,
      });

      jest
        .spyOn(fs.promises, "readFile")
        .mockRejectedValueOnce(new Error("File not found"));
      jest.spyOn(console, "warn").mockImplementation(() => {});

      // @ts-ignore - accessing private method for testing
      const result = await contextCreator["loadCustomInstructions"]();

      expect(result).toBe(fallbackInstructions);
      expect(console.warn).toHaveBeenCalled();
    });

    it("should return config.customInstructions when no path is provided", async () => {
      const configInstructions = "Config instructions";
      mocker.spyOnPrototypeAndReturn(ConfigService, "getConfig", {
        customInstructionsPath: "",
        customInstructions: configInstructions,
      });

      // @ts-ignore - accessing private method for testing
      const result = await contextCreator["loadCustomInstructions"]();

      expect(result).toBe(configInstructions);
      expect(fs.promises.readFile).not.toHaveBeenCalled();
    });

    it("should fallback to customInstructions in create method when file read fails", async () => {
      const fallbackInstructions = "Fallback custom instructions";
      mocker.spyOnPrototypeAndReturn(ConfigService, "getConfig", {
        customInstructionsPath: "/invalid/path",
        customInstructions: fallbackInstructions,
        includeAllFilesOnEnvToContext: true,
      });

      jest
        .spyOn(fs.promises, "readFile")
        .mockRejectedValueOnce(new Error("ENOENT: File not found"));
      jest.spyOn(console, "warn").mockImplementation(() => {});

      const message = "test message";
      const result = await contextCreator.create(message, "/test/root", true);

      expect(result).toContain(fallbackInstructions);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("Failed to load custom instructions"),
      );
    });
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
  });

  afterEach(() => {
    mocker.clearAllMocks();
    jest.clearAllMocks();
  });
});
