import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";
import { singleton } from "tsyringe";
import { z } from "zod";

const configSchema = z.object({
  provider: z.string(),
  customInstructions: z.string().optional(),
  customInstructionsPath: z.string().optional(),
  interactive: z.boolean(),
  stream: z.boolean(),
  debug: z.boolean(),
  options: z.string(),
  openRouterApiKey: z.string(),
  appUrl: z.string().optional().default("https://localhost:8080"),
  appName: z.string().optional().default("MyApp"),
  autoScaler: z.boolean().optional(),
  autoScaleMaxTryPerModel: z.number().optional(),
  includeAllFilesOnEnvToContext: z.boolean().optional().default(true),
  truncateFilesOnEnvAfterLinesLimit: z.number().optional().default(1000),
  // Phase-specific model configurations
  discoveryModel: z.string().optional().default("google/gemini-flash-1.5-8b"),
  strategyModel: z.string().optional().default("openai/o1-mini"),
  executeModel: z.string().optional().default("deepseek/deepseek-chat"),
  autoScaleAvailableModels: z.array(
    z.object({
      id: z.string(),
      description: z.string(),
      maxWriteTries: z.number(),
      maxGlobalTries: z.number(),
    }),
  ),
  runAllTestsCmd: z.string().optional(),
  runOneTestCmd: z.string().optional(),
  runAllFilesTypeCheckCmd: z.string().optional(),
  runOneFileTypeCheckCmd: z.string().optional(),
  enableConversationLog: z.boolean().optional(),
  logDirectory: z.string().optional(),
  directoryScanner: z
    .object({
      defaultIgnore: z
        .array(z.string())
        .default(["dist", "coverage", ".next", "build", ".cache", ".husky"]),
      maxDepth: z.number().default(8),
      allFiles: z.boolean().default(true),
      directoryFirst: z.boolean().default(true),
      excludeDirectories: z.boolean().default(false),
    })
    .default({
      defaultIgnore: ["dist", "coverage", ".next", "build", ".cache", ".husky"],
      maxDepth: 8,
      allFiles: true,
      directoryFirst: true,
      excludeDirectories: false,
    }),
  gitDiff: z
    .object({
      excludeLockFiles: z.boolean().default(true),
      lockFiles: z
        .array(z.string())
        .default([
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
        ]),
    })
    .default({
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
    }),
  referenceExamples: z.record(z.string(), z.string()).optional().default({}),
  projectLanguage: z.string().default("typescript"),
  packageManager: z.string().default("yarn"),
  timeoutSeconds: z.number().optional().default(0), // Add timeout property
});

export type Config = z.infer<typeof configSchema>;

@singleton()
export class ConfigService {
  private CONFIG_PATH: string;
  private readonly GITIGNORE_PATH = path.resolve(".gitignore");

  constructor() {
    this.CONFIG_PATH = path.resolve("crkdrc.json");
  }

  private validateConfigPath(resolvedPath: string): void {
    // Allow default path to not exist
    if (resolvedPath === path.resolve("crkdrc.json")) {
      return;
    }

    // For custom paths, require the file to exist
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Config path does not exist: ${resolvedPath}`);
    }

    try {
      const stats = fs.statSync(resolvedPath);
      if (!stats.isFile()) {
        throw new Error(`Path exists but is not a file: ${resolvedPath}`);
      }
      fs.accessSync(resolvedPath, fs.constants.R_OK | fs.constants.W_OK);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Invalid config path: ${error.message}`);
      }
      throw error;
    }
  }

  public setConfigPath(configPath?: string): void {
    if (!configPath || !configPath.trim()) {
      this.CONFIG_PATH = path.resolve("crkdrc.json");
      return;
    }

    const resolvedPath = path.resolve(configPath.trim());
    this.validateConfigPath(resolvedPath);
    this.CONFIG_PATH = resolvedPath;
  }

  private ensureGitIgnore(): void {
    const gitignoreContent = fs.existsSync(this.GITIGNORE_PATH)
      ? fs.readFileSync(this.GITIGNORE_PATH, "utf-8")
      : "";

    if (!gitignoreContent.includes("crkdrc.json")) {
      const updatedContent =
        gitignoreContent.endsWith("\n") || gitignoreContent === ""
          ? `${gitignoreContent}crkdrc.json\n`
          : `${gitignoreContent}\ncrkdrc.json\n`;

      fs.writeFileSync(
        this.GITIGNORE_PATH,
        updatedContent.replace(/\n/g, "\\n"),
      );
    }
  }

  public createDefaultConfig(): void {
    if (!fs.existsSync(this.CONFIG_PATH)) {
      console.log("Creating default crkdrc.json configuration...");

      const defaultConfig = {
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
        openRouterApiKey: "",
        appUrl: "https://localhost:8080",
        appName: "MyCrackedApp",
        autoScaler: true,
        autoScaleMaxTryPerModel: 2,
        // Phase-specific model configurations
        discoveryModel: "google/gemini-flash-1.5-8b",
        strategyModel: "qwen/qwq-32b-preview",
        executeModel: "anthropic/claude-3.5-sonnet:beta",
        includeAllFilesOnEnvToContext: true,
        truncateFilesOnEnvAfterLinesLimit: 1000,

        autoScaleAvailableModels: [
          {
            id: "anthropic/claude-3.5-sonnet:beta",
            description: "Cheap, fast, slightly better than GPT4o-mini",
            maxWriteTries: 5,
            maxGlobalTries: 10,
          },
          {
            id: "openai/o1-mini",
            description: "Cheap, fast, slightly better than GPT4o-mini",
            maxWriteTries: 5,
            maxGlobalTries: 10,
          },
        ],
        runAllTestsCmd: "yarn jest",
        runOneTestCmd: "yarn jest {relativeTestPath}",
        runAllFilesTypeCheckCmd:
          "yarn tsc --noEmit --skipLibCheck && yarn eslint --fix",
        runOneFileTypeCheckCmd:
          "yarn tsc --noEmit --skipLibCheck {relativeFilePath} && yarn eslint {relativeFilePath}",
        enableConversationLog: false,
        logDirectory: "logs",
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
        referenceExamples: {
          example1: "path/to/example1/file.ts",
        },
        timeoutSeconds: 0, // Add default timeout
      };
      fs.writeFileSync(
        this.CONFIG_PATH,
        JSON.stringify(defaultConfig, null, 4),
      );
      console.log(
        "Default crkdrc.json configuration created. Please adjust it.",
      );
      console.log(
        chalk.yellow(
          "Warning: No OpenRouter API key provided. Please add it to crkdrc.json.",
        ),
      );

      this.ensureGitIgnore();

      chalk.green(
        "CrackedDevCLI config generated. Please, add Provider and API Key to crkdrc.json.",
      );
    }
  }

  public getConfig(): Config {
    if (!fs.existsSync(this.CONFIG_PATH)) {
      this.createDefaultConfig();
    }

    const rawData = fs.readFileSync(this.CONFIG_PATH, "utf-8");
    const config = JSON.parse(rawData);

    const parsedConfig = configSchema.safeParse(config);

    if (!parsedConfig.success) {
      console.error(
        "Invalid configuration in crkdrc.json:",
        parsedConfig.error,
      );
      throw new Error("Invalid configuration in crkdrc.json");
    }

    return parsedConfig.data;
  }
}
