import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";

export class ConfigService {
  public static readonly CONFIG_PATH = path.resolve("crkdrc.json");

  public static createDefaultConfig(): void {
    if (!fs.existsSync(ConfigService.CONFIG_PATH)) {
      console.log("Creating default crkdrc.json configuration...");
      const defaultConfig = {
        model: "qwen/qwen-2.5-coder-32b-instruct",
        provider: "open-router",
        instructions: "Follow clean code principles",
        interactive: true,
        stream: true,
        debug: false,
        options: "temperature= 0.7, max_tokens=2000, top_p=0.9",
        openRouterApiKey: "",
      };
      fs.writeFileSync(
        ConfigService.CONFIG_PATH,
        JSON.stringify(defaultConfig, null, 4),
      );
      console.log(
        "Default crkdrc.json configuration created. Please adjust it.",
      );
      console.log(
        chalk.green("Add Provider, Model, and API Key to crkdrc.json."),
      );
    }
  }

  public static loadConfig(): Record<string, any> {
    if (fs.existsSync(ConfigService.CONFIG_PATH)) {
      const rawData = fs.readFileSync(ConfigService.CONFIG_PATH, "utf-8");
      return JSON.parse(rawData);
    }
    return {};
  }
}
