/* eslint-disable @typescript-eslint/ban-ts-comment */
import { ConfigService } from "@services/ConfigService";
import { DirectoryScanner } from "@services/FileManagement/DirectoryScanner";
import { ActionExecutor } from "@services/LLM/actions/ActionExecutor";
import { ProjectInfo } from "@services/LLM/utils/ProjectInfo";
import { UnitTestMocker } from "@tests/mocks/UnitTestMocker";
import * as fs from "fs";
import { container } from "tsyringe";
import { MessageContextBuilder } from "../context/MessageContextBuilder";
import { MessageContextCleaner } from "../context/MessageContextCleanup";
import { MessageContextHistory } from "../context/MessageContextHistory";
import { MessageContextStore } from "../context/MessageContextStore";
import { LLMContextCreator } from "../LLMContextCreator";
import { PhaseManager } from "../PhaseManager";
import { IPhasePromptArgs, Phase } from "../types/PhaseTypes";

describe("LLMContextCreator", () => {
  let mocker: UnitTestMocker;
  let contextCreator: LLMContextCreator;
  let messageContextStore: MessageContextStore;
  let phaseManager: PhaseManager;
  let messageContextCleaner: MessageContextCleaner;
  let messageContextBuilder: MessageContextBuilder;

  beforeEach(() => {
    mocker = new UnitTestMocker();

    // Get instances from container
    contextCreator = container.resolve(LLMContextCreator);
    messageContextStore = container.resolve(MessageContextStore);
    phaseManager = container.resolve(PhaseManager);
    messageContextCleaner = container.resolve(MessageContextCleaner);
    messageContextBuilder = container.resolve(MessageContextBuilder);

    // Mock phase config with proper prompt generation
    const mockPhaseConfig = {
      model: "test-model",
      generatePrompt: (args: IPhasePromptArgs) => {
        const envDetails = args.environmentDetails || "";
        const projectInfo = args.projectInfo || "";
        return `<phase_prompt>Test prompt for ${args.message}\n${envDetails}\n${projectInfo}</phase_prompt>`;
      },
    };

    // Mock all dependencies
    mocker.mockPrototype(MessageContextStore, "getContextData", {
      phaseInstructions: new Map(),
      fileOperations: new Map(),
      commandOperations: new Map(),
      conversationHistory: [],
      systemInstructions: null,
    });

    mocker.mockPrototype(
      PhaseManager,
      "getCurrentPhaseConfig",
      mockPhaseConfig,
    );
    mocker.mockPrototype(MessageContextCleaner, "cleanupContext", undefined);
    mocker.mockPrototype(
      MessageContextBuilder,
      "getLatestPhaseInstructions",
      null,
    );
    mocker.mockPrototype(PhaseManager, "setPhase", undefined);
    mocker.mockPrototype(PhaseManager, "getCurrentPhase", Phase.Discovery);
    mocker.mockPrototype(PhaseManager, "resetPhase", undefined);
    mocker.mockPrototype(MessageContextHistory, "clear", undefined);

    // Mock file system related dependencies
    mocker.mockPrototype(DirectoryScanner, "scan", {
      success: true,
      data: "file1\nfile2",
    });

    mocker.mockPrototype(ProjectInfo, "gatherProjectInfo", {
      dependencyFile: "package.json",
      mainDependencies: ["dep1", "dep2"],
      scripts: {
        test: "jest",
        build: "tsc",
      },
    });

    mocker.mockPrototype(ConfigService, "getConfig", {
      contextPaths: {
        includeFilesAndDirectories: false,
        includeDirectoriesOnly: true,
      },
      customInstructions: "Default custom instructions",
    });

    mocker.mockPrototype(ActionExecutor, "executeAction", {
      success: true,
    });
  });

  afterEach(() => {
    mocker.clearAllMocks();
    container.clearInstances();
  });

  describe("loadCustomInstructions", () => {
    it("should load custom instructions from file when path is provided", async () => {
      const customInstructions = "Custom instructions from file";
      mocker.mockPrototype(ConfigService, "getConfig", {
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

    it("should use config.customInstructions as fallback when path is not provided", async () => {
      const fallbackInstructions = "Fallback instructions";
      mocker.mockPrototype(ConfigService, "getConfig", {
        customInstructions: fallbackInstructions,
      });

      // @ts-ignore - accessing private method for testing
      const result = await contextCreator["loadCustomInstructions"]();

      expect(result).toBe(fallbackInstructions);
    });

    it("should throw error when neither path nor instructions are provided", async () => {
      mocker.mockPrototype(ConfigService, "getConfig", {});

      // @ts-ignore - accessing private method for testing
      await expect(contextCreator["loadCustomInstructions"]()).rejects.toThrow(
        "No custom instructions provided. Either customInstructionsPath or customInstructions must be set in config.",
      );
    });

    it("should throw error when file read fails", async () => {
      mocker.mockPrototype(ConfigService, "getConfig", {
        customInstructionsPath: "/path/to/instructions",
      });

      jest
        .spyOn(fs.promises, "readFile")
        .mockRejectedValueOnce(new Error("File not found"));

      // @ts-ignore - accessing private method for testing
      await expect(contextCreator["loadCustomInstructions"]()).rejects.toThrow(
        "Failed to load custom instructions from /path/to/instructions",
      );
    });
  });

  describe("phase prompt handling", () => {
    it("should not duplicate phase prompts for the same phase", async () => {
      // Setup initial phase
      phaseManager.setPhase(Phase.Discovery);

      // First message
      const firstContext = await contextCreator.create(
        "first message",
        "/root",
        true,
      );
      expect(firstContext).toContain("<phase_prompt>");

      // Mock store data for second call with existing phase instruction
      const phaseInstructions = new Map();
      phaseInstructions.set(Phase.Discovery, {
        phase: Phase.Discovery,
        content: "Test prompt for first message",
        timestamp: Date.now(),
      });

      mocker.mockPrototype(MessageContextStore, "getContextData", {
        phaseInstructions,
        fileOperations: new Map(),
        commandOperations: new Map(),
        conversationHistory: [],
        systemInstructions: null,
      });

      // Second message in same phase
      const secondContext = await contextCreator.create(
        "second message",
        "/root",
        false,
      );
      expect(secondContext).not.toContain("<phase_prompt>");

      // Verify context store was called correctly
      const getDataSpy = mocker.spyPrototype(
        MessageContextStore,
        "getContextData",
      );
      expect(getDataSpy).toHaveBeenCalled();
    });

    it("should add new phase prompt when phase changes", async () => {
      // Setup and first message
      phaseManager.setPhase(Phase.Discovery);
      await contextCreator.create("first message", "/root", true);

      // Change phase
      mocker.mockPrototype(PhaseManager, "getCurrentPhase", Phase.Strategy);
      phaseManager.setPhase(Phase.Strategy);

      // Mock store data for second call with different phase
      const phaseInstructions = new Map();
      phaseInstructions.set(Phase.Discovery, {
        phase: Phase.Discovery,
        content: "Test prompt for first message",
        timestamp: Date.now(),
      });

      mocker.mockPrototype(MessageContextStore, "getContextData", {
        phaseInstructions,
        fileOperations: new Map(),
        commandOperations: new Map(),
        conversationHistory: [],
        systemInstructions: null,
      });

      const newContext = await contextCreator.create(
        "second message",
        "/root",
        false,
      );

      expect(newContext).toContain("<phase_prompt>");
      const getDataSpy = mocker.spyPrototype(
        MessageContextStore,
        "getContextData",
      );
      expect(getDataSpy).toHaveBeenCalled();
    });
  });

  describe("first message handling", () => {
    it("should include environment details and project info on first message", async () => {
      const context = await contextCreator.create(
        "first message",
        "/root",
        true,
      );

      expect(context).toContain("Task");
      expect(context).toContain("first message");
      expect(context).toContain("Instructions");
      expect(context).toContain("Current Working Directory");
      expect(context).toContain("file1\nfile2");
      expect(context).toContain("Project Dependencies");
      expect(context).toContain("dep1, dep2");
      expect(context).toContain("test: jest");
      expect(context).toContain("build: tsc");
    });

    it("should create first time message without project info if no dependency file found", async () => {
      mocker.mockPrototype(ProjectInfo, "gatherProjectInfo", {
        mainDependencies: [],
        scripts: {},
      });

      const result = await contextCreator.create(
        "first message",
        "/root",
        true,
      );

      expect(result).toContain("Task");
      expect(result).toContain("first message");
      expect(result).toContain("Instructions");
      expect(result).toContain("Current Working Directory");
      expect(result).toContain("file1\nfile2");
      expect(result).not.toContain("Project Dependencies");
    });

    it("should reset phase and clean context on first message", async () => {
      await contextCreator.create("first message", "/root", true);

      const resetPhaseSpy = mocker.spyPrototype(PhaseManager, "resetPhase");
      const cleanupSpy = mocker.spyPrototype(
        MessageContextCleaner,
        "cleanupContext",
      );

      expect(resetPhaseSpy).toHaveBeenCalled();
      expect(cleanupSpy).toHaveBeenCalled();
    });

    it("should throw error if directory scan fails", async () => {
      const error = new Error("Scan failed");

      mocker.mockPrototype(DirectoryScanner, "scan", {
        success: false,
        error,
      });

      await expect(
        contextCreator.create("first message", "/root", true),
      ).rejects.toThrow("Failed to scan directory");
    });

    it("should not include environment details when config flag is false", async () => {
      mocker.mockPrototype(ConfigService, "getConfig", {
        contextPaths: {
          includeFilesAndDirectories: false,
          includeDirectoriesOnly: true,
        },
        customInstructions: "Default custom instructions",
      });

      const result = await contextCreator.create(
        "first message",
        "/root",
        true,
      );

      expect(result).toContain("Task");
      expect(result).toContain("first message");
      expect(result).not.toContain("file1\nfile2");
    });

    it("should correctly split initial instructions and phase instructions", async () => {
      const result = await contextCreator.create(
        "first message",
        "/root",
        true,
      );

      expect(result).toContain("# Task");
      expect(result).toContain('<instructions details="NEVER_OUTPUT">');
      expect(result).toContain("## Phase Instructions");

      const taskIndex = result.indexOf("# Task");
      const phaseIndex = result.indexOf("## Phase Instructions");
      expect(taskIndex).toBeLessThan(phaseIndex);
    });

    it("should maintain correct message order in context", async () => {
      // First message
      await contextCreator.create("first message", "/root", true);

      // Mock store data with some history
      const phaseInstructions = new Map();
      phaseInstructions.set(Phase.Discovery, {
        phase: Phase.Discovery,
        content: "Test phase prompt",
        timestamp: Date.now(),
      });

      const conversationHistory = [
        { role: "system", content: "system message 1" },
        { role: "system", content: "system message 2" },
        { role: "user", content: "first message" },
        { role: "assistant", content: "assistant response" },
      ];

      mocker.mockPrototype(MessageContextStore, "getContextData", {
        phaseInstructions,
        fileOperations: new Map(),
        commandOperations: new Map(),
        conversationHistory,
        systemInstructions: "system instructions",
      });

      // Get the context and verify order
      const contextData = messageContextStore.getContextData();
      const messages = messageContextBuilder.getMessageContext(contextData);

      // Verify order: system instructions -> system messages -> task -> phase prompt -> rest
      expect(messages[0].content).toBe("system instructions");
      expect(messages[1].content).toBe("system message 1");
      expect(messages[2].content).toBe("system message 2");
      expect(messages[3].content).toBe("first message");
      expect(messages[4].content).toContain("<phase_prompt>");
      expect(messages[5].content).toBe("assistant response");

      // Verify total number of messages
      expect(messages).toHaveLength(6);
    });
  });

  describe("formatInitialInstructions", () => {
    it("should format initial instructions with all fields present", async () => {
      const context = {
        message: "test message",
        projectInfo: "project info",
      };
      const customInstructions = "custom instructions";
      const envDetails = "env details";

      // @ts-ignore - accessing private method for testing
      const result = await contextCreator["formatInitialInstructions"](
        context,
        customInstructions,
        envDetails,
      );

      expect(result).toContain("# Task");
      expect(result).toContain("test message");
      expect(result).toContain("# Custom Instructions");
      expect(result).toContain("custom instructions");
      expect(result).toContain("env details");
      expect(result).toContain("project info");
    });

    it("should format initial instructions without envDetails", async () => {
      const context = {
        message: "test message",
        projectInfo: "project info",
      };
      const customInstructions = "custom instructions";

      // @ts-ignore - accessing private method for testing
      const result = await contextCreator["formatInitialInstructions"](
        context,
        customInstructions,
      );

      expect(result).toContain("# Task");
      expect(result).toContain("test message");
      expect(result).toContain("# Custom Instructions");
      expect(result).toContain("custom instructions");
      expect(result).not.toContain("env details");
      expect(result).toContain("project info");
    });
  });

  describe("file content truncation", () => {
    it("should truncate file content when it exceeds the limit", async () => {
      const longContent = Array(1500).fill("line").join("\n");
      mocker.mockPrototype(DirectoryScanner, "scan", {
        success: true,
        data: longContent,
      });

      mocker.mockPrototype(ConfigService, "getConfig", {
        contextPaths: {
          includeFilesAndDirectories: false,
          includeDirectoriesOnly: true,
        },
        truncateFilesOnEnvAfterLinesLimit: 1000,
        customInstructions: "test",
      });

      const context = await contextCreator.create(
        "test message",
        "/root",
        true,
      );
      expect(context).toContain("[Content truncated...]");
      expect(context.split("\n").length).toBeLessThan(1500);
    });

    it("should not truncate file content when under the limit", async () => {
      const shortContent = Array(500).fill("line").join("\n");
      mocker.mockPrototype(DirectoryScanner, "scan", {
        success: true,
        data: shortContent,
      });

      mocker.mockPrototype(ConfigService, "getConfig", {
        contextPaths: {
          includeFilesAndDirectories: false,
          includeDirectoriesOnly: true,
        },
        truncateFilesOnEnvAfterLinesLimit: 1000,
        customInstructions: "test",
      });

      const context = await contextCreator.create(
        "test message",
        "/root",
        true,
      );
      expect(context).not.toContain("[Content truncated...]");
      expect(context.split("\n").length).toBeLessThan(1000);
    });
  });
});
