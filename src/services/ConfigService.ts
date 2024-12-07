import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";
import { autoInjectable } from "tsyringe";
import { z } from "zod";

const configSchema = z.object({
  provider: z.string(),
  customInstructions: z.string(),
  interactive: z.boolean(),
  stream: z.boolean(),
  debug: z.boolean(),
  options: z.string(),
  openRouterApiKey: z.string(),
  appUrl: z.string().optional().default("https://localhost:8080"),
  appName: z.string().optional().default("MyApp"),
  autoScaler: z.boolean().optional(),
  autoScaleMaxTryPerModel: z.number().optional(),
  includeAllFilesOnEnvToContext: z.boolean().optional(),
  // Phase-specific model configurations
  discoveryModel: z.string().optional().default("google/gemini-flash-1.5-8b"),
  strategyModel: z.string().optional().default("qwen/qwq-32b-preview"),
  executeModel: z
    .string()
    .optional()
    .default("anthropic/claude-3.5-sonnet:beta"),
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
  runTypeCheckCmd: z.string().optional(),
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
});

export type Config = z.infer<typeof configSchema>;

@autoInjectable()
export class ConfigService {
  private readonly CONFIG_PATH = path.resolve("crkdrc.json");
  private readonly GITIGNORE_PATH = path.resolve(".gitignore");

  private ensureGitIgnore(): void {
    const gitignoreContent = fs.existsSync(this.GITIGNORE_PATH)
      ? fs.readFileSync(this.GITIGNORE_PATH, "utf-8")
      : "";

    if (!gitignoreContent.includes("crkdrc.json")) {
      const updatedContent =
        gitignoreContent.endsWith("\n") || gitignoreContent === ""
          ? `${gitignoreContent}crkdrc.json\n`
          : `${gitignoreContent}\ncrkdrc.json\n`;

      fs.writeFileSync(this.GITIGNORE_PATH, updatedContent);
    }
  }

  public createDefaultConfig(): void {
    if (!fs.existsSync(this.CONFIG_PATH)) {
      console.log("Creating default crkdrc.json configuration...");

      const defaultConfig = {
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
        // Phase-specific model configurations
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
