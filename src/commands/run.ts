import { Args, Command, Flags } from "@oclif/core";
import {
  CrackedAgent,
  CrackedAgentOptions,
  ExecutionResult,
} from "@services/CrackedAgent";
import { LLMProviderType } from "@services/LLM/LLMProvider";
import { ModelManager } from "@services/LLM/ModelManager";
import { OpenRouterAPI } from "@services/LLMProviders/OpenRouter/OpenRouterAPI";
import { InteractiveSessionManager } from "@services/streaming/InteractiveSessionManager";
import { StreamHandler } from "@services/streaming/StreamHandler";
import * as readline from "readline";
import { container } from "tsyringe";
import { ConfigService } from "../services/ConfigService";

export class Run extends Command {
  static description = "AI agent for performing operations on local projects";

  static examples = [
    "$ run 'Add error handling'",
    "$ run --interactive # Start interactive mode",
    "$ run --init # Initialize configuration",
    "$ run 'Add tests' --timeout 300 # Set timeout to 5 minutes",
  ];

  static flags = {
    init: Flags.boolean({
      description: "Initialize a default crkdrc.json configuration file",
      exclusive: ["interactive"],
    }),
    timeout: Flags.integer({
      description: "Set timeout for the operation in seconds",
      exclusive: ["init"],
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
  private sessionManager: InteractiveSessionManager;
  private rl: readline.Interface;

  constructor(argv: string[], config: any) {
    super(argv, config);
    this.configService = container.resolve(ConfigService);
    this.modelManager = container.resolve(ModelManager);
    this.streamHandler = container.resolve(StreamHandler);
    this.openRouterAPI = container.resolve(OpenRouterAPI);
    this.sessionManager = container.resolve(InteractiveSessionManager);
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: "> ",
    });
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
        timeout: (flags.timeout ?? config.timeoutSeconds ?? 0) * 1000, // Convert seconds to milliseconds
      };

      // Validate provider
      if (!Object.values(LLMProviderType).includes(options.provider!)) {
        throw new Error(`Invalid provider: ${options.provider}`);
      }

      this.modelManager.setCurrentModel(config.discoveryModel);

      console.log(
        `Using ${options.provider} provider and model: ${this.modelManager.getCurrentModel()}`,
      );

      const agent = container.resolve(CrackedAgent);
      this.sessionManager.initialize(this.rl, agent, options);

      if (isInteractive) {
        await this.sessionManager.start();
      } else {
        console.log("Press Enter to start the stream...");
        this.rl.once("line", async () => {
          try {
            const executePromise = agent.execute(
              args.message!,
              options,
            ) as Promise<ExecutionResult>;

            if (options.timeout > 0) {
              const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => {
                  reject(
                    new Error(
                      `Operation timed out after ${options.timeout / 1000} seconds`,
                    ),
                  );
                }, options.timeout);
              });

              try {
                await Promise.race([executePromise, timeoutPromise]);
              } catch (error) {
                this.sessionManager.cleanup();
                if (error.message.includes("timed out")) {
                  console.error("\n" + error.message);
                  process.exit(1);
                }
                throw error;
              }
            } else {
              await executePromise;
            }

            process.exit(0);
          } catch (error) {
            console.error("Error:", error);
            process.exit(1);
          }
        });
      }
    } catch (error) {
      this.sessionManager.cleanup();
      this.error((error as Error).message);
    }
  }
}
