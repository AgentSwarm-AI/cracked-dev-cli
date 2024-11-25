import { Args, Command, Flags } from "@oclif/core";
import { CrackedAgent } from "@services/CrackedAgent";
import { LLMProviderType } from "@services/LLM/LLMProvider";
import * as readline from "readline";
import { container } from "tsyringe";
import { ConfigService } from "../services/ConfigService";

export class Crkd extends Command {
  static description = "AI agent for performing operations on local projects";

  static examples = [
    "$ crkd 'Add error handling'",
    "$ crkd --interactive # Start interactive mode",
    "$ crkd --init --openRouterApiKey YOUR_API_KEY # Initialize configuration with API key",
  ];

  static flags = {
    init: Flags.boolean({
      description: "Initialize a default crkdrc.json configuration file",
      exclusive: ["interactive"],
    }),
    openRouterApiKey: Flags.string({
      description: "OpenRouter API key to use for initialization",
      dependsOn: ["init"],
      required: false,
    }),
  };

  static args = {
    message: Args.string({
      description: "Message describing the operation to perform",
      required: false,
    }),
  };

  private parseOptions(optionsString: string): Record<string, unknown> {
    const options: Record<string, unknown> = {};

    if (!optionsString) return options;

    const pairs = optionsString.split(",");
    for (const pair of pairs) {
      const [key, value] = pair.trim().split("=");
      if (!key || !value) continue;

      // Convert value to appropriate type
      if (value === "true") options[key] = true;
      else if (value === "false") options[key] = false;
      else if (!isNaN(Number(value))) {
        if (value.includes(".")) options[key] = parseFloat(value);
        else options[key] = parseInt(value, 10);
      } else options[key] = value;
    }

    return options;
  }

  private createReadlineInterface() {
    return readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: "> ",
    });
  }

  private async startInteractiveMode(agent: CrackedAgent, options: any) {
    const rl = this.createReadlineInterface();
    console.log(
      'Interactive mode started. Type "exit" or press Ctrl+C to quit.',
    );

    rl.prompt();

    rl.on("line", async (input) => {
      if (input.toLowerCase() === "exit") {
        console.log("Goodbye!");
        rl.close();
        return;
      }

      try {
        const result = await agent.execute(input, options);
        if (!options.stream && result) {
          console.log("\nResponse:", result.response);
          if (result.actions?.length) {
            console.log("\nExecuted Actions:");
            result.actions.forEach(({ action, result }) => {
              console.log(`\nAction: ${action}`);
              console.log(`Result: ${JSON.stringify(result, null, 2)}`);
            });
          }
        }
      } catch (error) {
        console.error("Error:", (error as Error).message);
      }

      rl.prompt();
    }).on("close", () => {
      process.exit(0);
    });
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Crkd);

    if (flags.init && !flags.openRouterApiKey) {
      this.error(
        "Must provide OpenRouter API key (--openRouterApiKey) when initializing configuration",
      );
    }

    if (flags.init) {
      ConfigService.createDefaultConfig(flags.openRouterApiKey);
      return;
    }

    const config = ConfigService.loadConfig();
    const isInteractive = config.interactive ?? false;

    if (isInteractive && args.message) {
      this.error("Cannot provide both interactive mode and message argument");
    }

    if (!isInteractive && !args.message) {
      this.error("Must provide either interactive mode or message argument");
    }

    try {
      const options = {
        ...config,
        options: this.parseOptions(config.options || ""),
        provider: config.provider as LLMProviderType,
      } as any;

      // Validate provider
      if (!Object.values(LLMProviderType).includes(options.provider)) {
        throw new Error(`Invalid provider: ${options.provider}`);
      }

      console.log(
        `Using ${options.provider} provider and model: ${options.model}`,
      );

      const agent = container.resolve(CrackedAgent);

      if (isInteractive) {
        await this.startInteractiveMode(agent, options);
      } else {
        const result = await agent.execute(args.message!, options);
        if (!options.stream && result) {
          this.log(result.response);
          if (result.actions?.length) {
            this.log("\nExecuted Actions:");
            result.actions.forEach(({ action, result }) => {
              this.log(`\nAction: ${action}`);
              this.log(`Result: ${JSON.stringify(result, null, 2)}`);
            });
          }
        }
      }
    } catch (error) {
      this.error((error as Error).message);
    }
  }
}
