import chalk from "chalk";
import fs, { truncate } from "fs";
import path from "path";
import { ConfigService } from "../services/ConfigService";

jest.mock("fs");
jest.mock("chalk");

describe("ConfigService", () => {
  // Common test constants
  const mockGitignorePath = path.resolve(".gitignore");
  const defaultConfigPath = path.resolve("crkdrc.json");
  const customConfigPath = path.resolve("custom/path/config.json");
  let configService: ConfigService;

  // Common test data
  const validMockConfig = {
    provider: "open-router",
    projectLanguage: "typescript",
    packageManager: "yarn",
    interactive: true,
    stream: true,
    debug: false,
    options: "temperature=0",
    openRouterApiKey: "test-key",
    appUrl: "https://localhost:8080",
    appName: "MyApp",
    autoScaler: true,
    autoScaleMaxTryPerModel: 2,
    contextPaths: {
      includeFilesAndDirectories: false,
      includeDirectoriesOnly: true,
    },
    truncateFilesOnEnvAfterLinesLimit: 1000,
    discoveryModel: "google/gemini-flash-1.5-8b",
    strategyModel: "openai/o1-mini",
    executeModel: "anthropic/claude-3.5-sonnet:beta",
    autoScaleAvailableModels: [],
    directoryScanner: {
      defaultIgnore: ["dist", "coverage", ".next", "build", ".cache", ".husky"],
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

  // Helper functions
  const setupBasicMocks = () => {
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(
      JSON.stringify(validMockConfig),
    );
  };

  const mockFsExists = (exists: boolean) => {
    (fs.existsSync as jest.Mock).mockReturnValue(exists);
  };

  const mockFsReadFile = (content: any) => {
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(content));
  };

  const mockFsWriteFile = () => {
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
  };

  const mockFsStatSync = (isFile: boolean) => {
    (fs.statSync as jest.Mock).mockReturnValue({ isFile: () => isFile });
  };

  const createFullMockConfig = () => ({
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
    contextPaths: {
      includeFilesAndDirectories: false,
      includeDirectoriesOnly: true,
    },
    truncateFilesOnEnvAfterLinesLimit: 1000,
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
      defaultIgnore: ["dist", "coverage", ".next", "build", ".cache", ".husky"],
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
  });

  beforeEach(setupBasicMocks);

  describe("config path handling", () => {
    beforeEach(setupBasicMocks);

    it("should use crkdrc.json as default path (backward compatibility)", () => {
      configService = new ConfigService();
      mockFsReadFile(validMockConfig);

      expect((configService as any).CONFIG_PATH).toBe(defaultConfigPath);
      const config = configService.getConfig();
      expect(config).toBeDefined();
      expect(fs.readFileSync).toHaveBeenCalledWith(defaultConfigPath, "utf-8");
    });

    it("should handle valid custom path correctly", () => {
      const validPath = "custom/path/config.json";
      configService = new ConfigService();
      const resolvedPath = path.resolve(validPath);

      (fs.existsSync as jest.Mock).mockImplementation(
        (p) => p === resolvedPath,
      );
      mockFsStatSync(true);
      mockFsReadFile(validMockConfig);

      configService.setConfigPath(validPath);

      expect((configService as any).CONFIG_PATH).toBe(resolvedPath);
      const config = configService.getConfig();
      expect(config).toBeDefined();
      expect(fs.readFileSync).toHaveBeenCalledWith(resolvedPath, "utf-8");
    });

    it("should fall back to default path when given invalid path", () => {
      const invalidPaths = ["", " ", null, undefined];

      invalidPaths.forEach((invalidPath) => {
        configService = new ConfigService();
        configService.setConfigPath(invalidPath as string);
        expect((configService as any).CONFIG_PATH).toBe(
          path.resolve("crkdrc.json"),
        );
      });
    });

    it("should create config file at default path", () => {
      configService = new ConfigService();
      mockFsExists(false);
      mockFsWriteFile();

      configService.createDefaultConfig();

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        defaultConfigPath,
        expect.any(String),
      );
    });

    it("should use default path when no custom path provided", () => {
      configService = new ConfigService();
      expect((configService as any).CONFIG_PATH).toBe(defaultConfigPath);
    });

    it("should use custom path when provided", () => {
      configService = new ConfigService();
      const customPath = "custom/path/config.json";
      const resolvedPath = path.resolve(customPath);
      (fs.existsSync as jest.Mock).mockImplementation(
        (p) => p === resolvedPath,
      );
      mockFsStatSync(true);
      configService.setConfigPath(customPath);
      expect((configService as any).CONFIG_PATH).toBe(resolvedPath);
    });

    it("should read config from custom path", () => {
      configService = new ConfigService();
      (fs.existsSync as jest.Mock).mockImplementation(
        (p) => p === customConfigPath,
      );
      mockFsStatSync(true);
      mockFsReadFile(validMockConfig);
      configService.setConfigPath(customConfigPath);
      const config = configService.getConfig();

      expect(fs.readFileSync).toHaveBeenCalledWith(customConfigPath, "utf-8");
      expect(config).toMatchObject(validMockConfig);
    });

    it("should handle empty path by using default", () => {
      configService = new ConfigService();
      configService.setConfigPath("");
      expect((configService as any).CONFIG_PATH).toBe(defaultConfigPath);
    });

    it("should throw error when using non-existent path", () => {
      const nonExistentPath = "non/existent/config.json";
      configService = new ConfigService();
      mockFsExists(false);

      expect(() => configService.setConfigPath(nonExistentPath)).toThrow(
        `Config path does not exist: ${path.resolve(nonExistentPath)}`,
      );
    });

    it("should throw error when path exists but is not a file", () => {
      const nonFilePath = "directory/path";
      configService = new ConfigService();
      const resolvedPath = path.resolve(nonFilePath);
      mockFsExists(true);
      mockFsStatSync(false);

      expect(() => configService.setConfigPath(nonFilePath)).toThrow(
        `Path exists but is not a file: ${resolvedPath}`,
      );
    });
  });

  describe("createDefaultConfig", () => {
    it("should create a default config file if it does not exist", () => {
      configService = new ConfigService();
      mockFsExists(false);
      mockFsWriteFile();
      mockFsReadFile("");

      configService.createDefaultConfig();

      expect(fs.existsSync).toHaveBeenCalledWith(defaultConfigPath);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        defaultConfigPath,
        expect.any(String),
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockGitignorePath,
        "crkdrc.json\\n",
      );
      expect(chalk.green).toHaveBeenCalledWith(
        "CrackedDevCLI config generated. Please, add Provider and API Key to crkdrc.json.",
      );
    });

    it("should not create a default config file if it already exists", () => {
      configService = new ConfigService();
      mockFsExists(true);

      configService.createDefaultConfig();

      expect(fs.existsSync).toHaveBeenCalledWith(defaultConfigPath);
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe("getConfig", () => {
    it("should load a valid config file", () => {
      const mockConfig = createFullMockConfig();
      configService = new ConfigService();
      mockFsExists(true);
      mockFsReadFile(mockConfig);

      const config = configService.getConfig();

      expect(fs.existsSync).toHaveBeenCalledWith(defaultConfigPath);
      expect(fs.readFileSync).toHaveBeenCalledWith(defaultConfigPath, "utf-8");
      expect(config).toEqual(mockConfig);
    });

    it("should validate project language and package manager", () => {
      const mockInvalidConfig = {
        provider: "open-router",
        interactive: true,
        stream: true,
        debug: false,
        options: "temperature=0",
        openRouterApiKey: "test-key",
        autoScaleAvailableModels: [],
        projectLanguage: 123,
        packageManager: undefined,
      };

      configService = new ConfigService();
      mockFsExists(true);
      mockFsReadFile(mockInvalidConfig);

      expect(() => configService.getConfig()).toThrow();
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
        autoScaleAvailableModels: [], // Add required field
      };

      configService = new ConfigService();
      mockFsExists(true);
      mockFsReadFile(mockInvalidConfig);

      expect(() => configService.getConfig()).toThrow(
        /Invalid configuration in crkdrc.json/,
      );
    });

    it("should throw an error if the config file does not exist or is empty", () => {
      configService = new ConfigService();
      mockFsExists(false);
      mockFsReadFile({});

      expect(() => configService.getConfig()).toThrow(
        "Invalid configuration in crkdrc.json",
      );

      expect(fs.existsSync).toHaveBeenCalledWith(defaultConfigPath);
    });

    it("should accept valid project language and package manager", () => {
      const mockConfig = {
        ...validMockConfig,
        projectLanguage: "ruby",
        packageManager: "bundler",
      };

      configService = new ConfigService();
      mockFsExists(true);
      mockFsReadFile(mockConfig);

      const config = configService.getConfig();
      expect(config.projectLanguage).toBe("ruby");
      expect(config.packageManager).toBe("bundler");
    });

    it("should accept any string for project language and package manager", () => {
      const mockConfig = createFullMockConfig();
      mockConfig.projectLanguage = "ruby";
      mockConfig.packageManager = "bundler";

      configService = new ConfigService();
      mockFsExists(true);
      mockFsReadFile(mockConfig);

      const config = configService.getConfig();
      expect(config.projectLanguage).toBe("ruby");
      expect(config.packageManager).toBe("bundler");
    });
  });

  describe("environment context configuration", () => {
    it("should use default values for environment context settings", () => {
      const minimalConfig = {
        provider: "open-router",
        interactive: true,
        stream: true,
        debug: false,
        options: "temperature=0",
        openRouterApiKey: "test-key",
        autoScaleAvailableModels: [],
        contextPaths: {
          includeFilesAndDirectories: false,
          includeDirectoriesOnly: true,
        },
        truncateFilesOnEnvAfterLinesLimit: 1000,
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify(minimalConfig),
      );

      const config = configService.getConfig();
      expect(config.contextPaths.includeFilesAndDirectories).toBe(false);
      expect(config.contextPaths.includeDirectoriesOnly).toBe(true);
      expect(config.truncateFilesOnEnvAfterLinesLimit).toBe(1000);
    });

    it("should allow custom values for environment context settings", () => {
      const validMockConfig = {
        provider: "open-router",
        interactive: true,
        stream: true,
        debug: false,
        options: "temperature=0",
        openRouterApiKey: "test-key",
        autoScaleAvailableModels: [],
      };

      const customConfig = {
        ...validMockConfig,
        contextPaths:{
          includeFilesAndDirectories: true,
          includeDirectoriesOnly: false,
        },
        truncateFilesOnEnvAfterLinesLimit: 500,      
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify(customConfig),
      );

      const config = configService.getConfig();
      expect(config.contextPaths.includeDirectoriesOnly).toBe(false);
      expect(config.contextPaths.includeFilesAndDirectories).toBe(true);
      expect(config.truncateFilesOnEnvAfterLinesLimit).toBe(500);
    });
  });
});
