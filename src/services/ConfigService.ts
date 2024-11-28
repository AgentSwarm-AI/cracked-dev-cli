import { DEFAULT_INITIAL_MODEL } from "@constants/models";
import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";
import { autoInjectable } from "tsyringe";
import { z } from "zod";

const configSchema = z.object({
  model: z.string(),
  provider: z.string(),
  customInstructions: z.string(),
  interactive: z.boolean(),
  stream: z.boolean(),
  debug: z.boolean(),
  options: z.string(),
  openRouterApiKey: z.string(),
  autoScaler: z.boolean().optional(),
  includeAllFilesOnEnvToContext: z.boolean().optional(),
  runAllTestsCmd: z.string().optional(),
  runOneTestCmd: z.string().optional(),
  runTypeCheckCmd: z.string().optional(),
  enableConversationLog: z.boolean().optional(),
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

  public createDefaultConfig(openRouterApiKey?: string): void {
    if (!fs.existsSync(this.CONFIG_PATH)) {
      console.log("Creating default crkdrc.json configuration...");
      const apiKey = openRouterApiKey || process.env.OPENROUTER_API_KEY || "";

      const defaultConfig = {
        model: DEFAULT_INITIAL_MODEL,
        provider: "open-router",
        customInstructions: "Follow clean code principles",
        interactive: true,
        stream: true,
        debug: false,
        options:
          "temperature=0,top_p=0.1,top_k=1,frequence_penalty=0.0,presence_penalty=0.0,repetition_penalty=1.0",
        openRouterApiKey: apiKey,
        autoScaler: true,
        includeAllFilesOnEnvToContext: false,
        runAllTestsCmd: "yarn test",
        runOneTestCmd: "yarn test {relativeTestPath}",
        runTypeCheckCmd: "yarn typecheck",
        enableConversationLog: false,
      };
      fs.writeFileSync(
        this.CONFIG_PATH,
        JSON.stringify(defaultConfig, null, 4),
      );
      console.log(
        "Default crkdrc.json configuration created. Please adjust it.",
      );
      if (!apiKey) {
        console.log(
          chalk.yellow(
            "Warning: No OpenRouter API key provided. Please add it to crkdrc.json or .env file.",
          ),
        );
      }

      this.ensureGitIgnore();

      chalk.green(
        "CrackedDevCLI config generated. Please, add Provider, Model, and API Key to crkdrc.json.",
      );
    }
  }

  public getConfig(): Config {
    if (fs.existsSync(this.CONFIG_PATH)) {
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
    return {} as Config;
  }
}
