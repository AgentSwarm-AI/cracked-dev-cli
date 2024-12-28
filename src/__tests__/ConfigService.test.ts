import chalk from "chalk";
import fs from "fs";
import path from "path";
import { ConfigService } from "../services/ConfigService";

jest.mock("fs");
jest.mock("chalk");

describe("ConfigService", () => {
  const mockConfigPath = path.resolve("crkdrc.json");
  const mockGitignorePath = path.resolve(".gitignore");
  let configService: ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    configService = new ConfigService();
  });

  describe("createDefaultConfig", () => {
    it("should create a default config file if it does not exist", () => {
      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(false) // for config file
        .mockReturnValueOnce(false); // for gitignore
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
      (fs.readFileSync as jest.Mock).mockReturnValue("");

      configService.createDefaultConfig();

      expect(fs.existsSync).toHaveBeenCalledWith(mockConfigPath);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockConfigPath,
        expect.any(String),
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockGitignorePath,
        "crkdrc.json\n",
      );
      expect(chalk.green).toHaveBeenCalledWith(
        "CrackedDevCLI config generated. Please, add Provider and API Key to crkdrc.json.",
      );
    });

    it("should not create a default config file if it already exists", () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      configService.createDefaultConfig();

      expect(fs.existsSync).toHaveBeenCalledWith(mockConfigPath);
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe("getConfig", () => {
    it("should load a valid config file", () => {
      const mockConfig = {
        provider: "open-router",
        projectLanguage: "typescript",
        packageManager: "yarn",
        customInstructions: "Follow clean code principles",
        customInstructionsPath: "",
        interactive: true,
        stream: true,
        debug: false,
        options:
          "temperature=0,top_p=0.1,top_k=1,frequence_penalty=0.0,presence_penalty=0.0,repetition_penalty=1.0",
        openRouterApiKey: "test-key",
        appUrl: "https://localhost:8080",
        appName: "MyApp",
        autoScaler: true,
        autoScaleMaxTryPerModel: 2,
        discoveryModel: "google/gemini-flash-1.5-8b",
        strategyModel: "qwen/qwq-32b-preview",
        executeModel: "anthropic/claude-3.5-sonnet:beta",
        includeAllFilesOnEnvToContext: false,
        autoScaleAvailableModels: [
          {
            id: "qwen/qwen-2.5-coder-32b-instruct",
            description: "Cheap, fast, slightly better than GPT4o-mini",
            maxWriteTries: 5,
            maxGlobalTries: 10,
          },
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
        runAllTestsCmd: "yarn test",
        runOneTestCmd: "yarn test {relativeTestPath}",
        runTypeCheckCmd: "yarn typecheck",
        enableConversationLog: false,
        directoryScanner: {
          defaultIgnore: [
            "dist",
            "coverage",
            ".next",
            "build",
            ".cache",
            ".husky",
          ],
          maxDepth: 8,
          allFiles: true,
          directoryFirst: true,
          excludeDirectories: false,
        },
        gitDiff: {
          excludeLockFiles: true,
          lockFiles: [
            "package-lock.json",
            "yarn.lock",
            "pnpm-lock.yaml",
            "Gemfile.lock",
            "composer.lock",
            "Pipfile.lock",
            "poetry.lock",
            "packages.lock.json",
            "Cargo.lock",
            "Podfile.lock",
            "mix.lock",
            "go.sum",
            "pubspec.lock",
          ],
        },
        referenceExamples: {}, // Added referenceExamples
        timeout: 0,
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify(mockConfig),
      );

      const config = configService.getConfig();

      expect(fs.existsSync).toHaveBeenCalledWith(mockConfigPath);
      expect(fs.readFileSync).toHaveBeenCalledWith(mockConfigPath, "utf-8");
      expect(config).toEqual(mockConfig);
    });

    it("should validate project language and package manager", () => {
      const mockInvalidConfig = {
        provider: "open-router",
        projectLanguage: "invalid-language",
        packageManager: "invalid-manager",
        customInstructions: "Follow clean code principles",
        interactive: true,
        stream: true,
        debug: false,
        options: "temperature=0",
        openRouterApiKey: "test-key",
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify(mockInvalidConfig),
      );

      expect(() => configService.getConfig()).toThrow(
        "Invalid configuration in crkdrc.json",
      );
    });

    it("should throw an error for an invalid config file", () => {
      const mockInvalidConfig = {
        model: 123, // Should be string
        provider: true, // Should be string
        customInstructions: [], // Should be string
        interactive: "true", // Should be boolean
        stream: "yes", // Should be boolean
        debug: "false", // Should be boolean
        options: 456, // Should be string
        openRouterApiKey: 123, // Should be string
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify(mockInvalidConfig),
      );

      expect(() => configService.getConfig()).toThrow(
        /Invalid configuration in crkdrc.json/,
      );
    });

    it("should throw an error if the config file does not exist or is empty", () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.readFileSync as jest.Mock).mockReturnValue("{}");

      expect(() => configService.getConfig()).toThrow(
        "Invalid configuration in crkdrc.json",
      );

      expect(fs.existsSync).toHaveBeenCalledWith(mockConfigPath);
    });

    it("should accept any string for project language and package manager", () => {
      const mockConfig = {
        provider: "open-router",
        projectLanguage: "ruby",
        packageManager: "bundler",
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
        discoveryModel: "model1",
        strategyModel: "model2",
        executeModel: "model3",
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
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify(mockConfig),
      );

      const config = configService.getConfig();
      expect(config.projectLanguage).toBe("ruby");
      expect(config.packageManager).toBe("bundler");
    });
  });
});
