import { Args, Command, Flags } from "@oclif/core";
import { CrackedAgent, CrackedAgentOptions } from "@services/CrackedAgent";
import { LLMProviderType } from "@services/LLM/LLMProvider";
import { ModelManager } from "@services/LLM/ModelManager";
import { OpenRouterAPI } from "@services/LLMProviders/OpenRouter/OpenRouterAPI";
import { StreamHandler } from "@services/streaming/StreamHandler";
import * as readline from "readline";
import { container } from "tsyringe";
import * as tty from "tty";
import { ConfigService } from "../services/ConfigService";

export class Run extends Command {
  static description = "AI agent for performing operations on local projects";

  static examples = [
    "$ run 'Add error handling'",
    "$ run --interactive # Start interactive mode",
    "$ run --init # Initialize configuration",
  ];

  static flags = {
    init: Flags.boolean({
      description: "Initialize a default crkdrc.json configuration file",
      exclusive: ["interactive"],
    }),
  };

  static args = {
    message: Args.string({
      description: "Message describing the operation to perform",
      required: false,
    }),
  };

  private configService: ConfigService;
  private modelManager: ModelManager;
  private streamHandler: StreamHandler;
  private openRouterAPI: OpenRouterAPI;
  private rl: readline.Interface;
  private currentMessage: string = "";

  constructor(argv: string[], config: any) {
    super(argv, config);
    this.configService = container.resolve(ConfigService);
    this.modelManager = container.resolve(ModelManager);
    this.streamHandler = container.resolve(StreamHandler);
    this.openRouterAPI = container.resolve(OpenRouterAPI);
    this.rl = this.createReadlineInterface();
  }

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

  private setupKeypressHandling() {
    if (process.stdin instanceof tty.ReadStream) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on("data", async (buffer) => {
        const key = buffer.toString();
        if (key === "\u001B") {
          // Escape key
          this.openRouterAPI.cancelStream();
          console.log("\nStreaming cancelled.");
          await this.restartStream();
        }
      });
    }
  }

  private async restartStream() {
    console.log("Please type your new prompt and press enter...");

    this.rl.prompt();

    const config = this.configService.getConfig();
    const options: CrackedAgentOptions = {
      ...config,
      options: this.parseOptions(config.options || ""),
      provider: config.provider as LLMProviderType,
    };

    const agent = container.resolve(CrackedAgent);

    // If we have a current message, restart with it
    if (this.currentMessage) {
      await this.startStream(agent, options);
    } else {
      // Otherwise, prompt for new input
      this.rl.prompt();
    }
  }

  private async startInteractiveMode(
    agent: CrackedAgent,
    options: CrackedAgentOptions,
  ) {
    console.log(
      'Interactive mode started. Type "exit" or press Ctrl+C to quit.',
    );

    this.setupKeypressHandling();

    this.rl.prompt();

    this.rl
      .on("line", async (input) => {
        if (input.toLowerCase() === "exit") {
          console.log("Goodbye!");
          this.rl.close();
          process.exit(0);
        }

        this.currentMessage = input;

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

        this.rl.prompt();
      })
      .on("close", () => {
        process.exit(0);
      });
  }

  private async startStream(agent: CrackedAgent, options: CrackedAgentOptions) {
    this.rl.prompt();

    this.rl
      .on("line", async (input) => {
        if (input.toLowerCase() === "exit") {
          console.log("Goodbye!");
          this.rl.close();
          process.exit(0);
        }

        this.currentMessage = input;

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

        this.rl.prompt();
      })
      .on("close", () => {
        process.exit(0);
      });
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Run);

    if (flags.init) {
      this.configService.createDefaultConfig();
      return;
    }

    const config = this.configService.getConfig();

    if (!config.openRouterApiKey) {
      this.error(
        "OpenRouter API key is required. Please add it to crkdrc.json",
      );
    }

    const isInteractive = config.interactive ?? false;

    if (isInteractive && args.message) {
      this.error("Cannot provide both interactive mode and message argument");
    }

    if (!isInteractive && !args.message) {
      this.error("Must provide either interactive mode or message argument");
    }

    try {
      if (!config.discoveryModel) {
        throw new Error("Discovery model is required in configuration");
      }

      const options: CrackedAgentOptions = {
        ...config,
        options: this.parseOptions(config.options || ""),
        provider: config.provider as LLMProviderType,
      };

      // Validate provider
      if (!Object.values(LLMProviderType).includes(options.provider!)) {
        throw new Error(`Invalid provider: ${options.provider}`);
      }

      console.log(
        `Using ${options.provider} provider and model: ${this.modelManager.getCurrentModel()}`,
      );

      const agent = container.resolve(CrackedAgent);

      if (isInteractive) {
        await this.startInteractiveMode(agent, options);
      } else {
        console.log("Press Enter to start the stream...");
        this.rl.once("line", async () => {
          this.currentMessage = args.message!;
          try {
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
          } catch (error) {
            this.error((error as Error).message);
          }
        });
      }
    } catch (error) {
      this.error((error as Error).message);
    }
  }
}
