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
        "CrackedDevCLI config generated. Please, add Provider, Model, and API Key to crkdrc.json.",
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
        model: "qwen/qwen-2.5-coder-32b-instruct",
        provider: "open-router",
        customInstructions: "Follow clean code principles",
        interactive: true,
        stream: true,
        debug: false,
        options:
          "temperature=0,top_p=0.1,top_k=1,frequence_penalty=0.0,presence_penalty=0.0,repetition_penalty=1.0",
        openRouterApiKey: "test-key",
        autoScaler: true,
        includeAllFilesOnEnvToContext: false,
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

    it("should create default config if the config file does not exist", () => {
      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(false) // First check
        .mockReturnValueOnce(false) // gitignore check
        .mockReturnValueOnce(true); // Second check after creation

      const defaultConfig = {
        model: "qwen/qwen-2.5-coder-32b-instruct",
        provider: "open-router",
        customInstructions: "Follow clean code principles",
        interactive: true,
        stream: true,
        debug: false,
        options:
          "temperature=0,top_p=0.1,top_k=1,frequence_penalty=0.0,presence_penalty=0.0,repetition_penalty=1.0",
        openRouterApiKey: "",
        appUrl: "https://localhost:8080",
        appName: "MyCrackedApp",
        autoScaler: true,
        autoScaleMaxTryPerModel: 2,
        includeAllFilesOnEnvToContext: false,
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
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify(defaultConfig),
      );

      const config = configService.getConfig();
      expect(config).toEqual(defaultConfig);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockConfigPath,
        expect.any(String),
      );
    });
  });
});
