import fs from "fs";
import path from "path";
import { ConfigService } from "../../services/ConfigService";

export class ConfigServiceTestHelper {
  public static readonly mockGitignorePath = path.resolve(".gitignore");
  public static readonly defaultConfigPath = path.resolve("crkdrc.json");
  public static readonly customConfigPath = path.resolve(
    "custom/path/config.json",
  );

  public static readonly validMockConfig = {
    provider: "open-router",
    projectLanguage: "typescript",
    packageManager: "yarn",
    interactive: true,
    stream: true,
    debug: false,
    options: "temperature=0",
    openRouterApiKey: "test-key",
    autoScaleAvailableModels: [], // Required by schema
  };

  public static readonly fullMockConfig = {
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
    discoveryModel: "google/gemini-pro-1.5",
    strategyModel: "deepseek/deepseek-chat",
    executeModel: "deepseek/deepseek-chat",
    includeAllFilesOnEnvToContext: false,
    autoScaleAvailableModels: [
      {
        id: "google/gemini-2.0-flash-thinking-exp:free",
        description: "Cheap, fast, slightly better than GPT4o-mini",
        maxWriteTries: 5,
        maxGlobalTries: 10,
      },
    ],
    runAllTestsCmd: "yarn jest",
    runOneTestCmd: "yarn jest {relativeTestPath}",
    runAllFilesTypeCheckCmd: "yarn typecheck",
    runOneFileTypeCheckCmd: "yarn typecheck {filePath}",
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
  };

  public static setupMocks() {
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(
      JSON.stringify(this.validMockConfig),
    );
  }

  public static createConfigService(): ConfigService {
    return new ConfigService();
  }

  public static mockFsExists(exists: boolean) {
    (fs.existsSync as jest.Mock).mockReturnValue(exists);
  }

  public static mockFsReadFile(content: any) {
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(content));
  }

  public static mockFsWriteFile() {
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
  }

  public static mockFsStatSync(isFile: boolean) {
    (fs.statSync as jest.Mock).mockReturnValue({ isFile: () => isFile });
  }
}
