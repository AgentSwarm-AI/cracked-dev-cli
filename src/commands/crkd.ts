import { Args, Command, Flags } from "@oclif/core";
import * as readline from "readline";
import { container } from "tsyringe";
import { CrackedAgent } from "../services/CrackedAgent";
import { LLMProviderType } from "../services/LLM/LLMProvider";

export class Crkd extends Command {
  static description = "AI agent for performing operations on local projects";

  static examples = [
    '$ crkd --root ./my-project --instructions-path ./instructions.md --model gpt-4 "Add error handling"',
    '$ crkd -r ./my-project --instructions "Follow clean code" -m gpt-4 "Create component"',
    '$ crkd --instructions "Use TypeScript" -m gpt-4 --options "temperature=0.7,max_tokens=2000,top_p=0.9" "Create new component"',
    "$ crkd --interactive -m gpt-4 # Start interactive mode",
  ];

  static flags = {
    root: Flags.string({
      char: "r",
      description: "Root path of the codebase to operate on",
      required: false,
      default: process.cwd(),
    }),
    instructionsPath: Flags.string({
      description: "Path to custom instructions file",
      required: false,
      exclusive: ["instructions"],
    }),
    instructions: Flags.string({
      description: "Raw custom instructions string",
      required: false,
      exclusive: ["instructionsPath"],
    }),
    model: Flags.string({
      char: "m",
      description: "AI model to use",
      required: true,
      default: "gpt-4",
    }),
    provider: Flags.string({
      char: "p",
      description: "LLM provider to use",
      options: Object.values(LLMProviderType),
      required: true,
    }),
    stream: Flags.boolean({
      char: "s",
      description: "Stream the AI response",
      default: false,
    }),
    debug: Flags.boolean({
      char: "d",
      description: "Enable debug mode",
      default: false,
    }),
    options: Flags.string({
      char: "o",
      description:
        'LLM options in key=value format (e.g., "temperature=0.7,max_tokens=2000,top_p=0.9")',
      required: false,
    }),
    interactive: Flags.boolean({
      char: "i",
      description: "Enable interactive mode for continuous conversation",
      default: false,
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

    if (flags.interactive && args.message) {
      this.error("Cannot provide both interactive mode and message argument");
      return;
    }

    if (!flags.interactive && !args.message) {
      this.error("Must provide either interactive mode or message argument");
      return;
    }

    try {
      const agent = container.resolve(CrackedAgent);
      const options = {
        root: flags.root,
        instructionsPath: flags.instructionsPath,
        instructions: flags.instructions,
        model: flags.model,
        provider: flags.provider as LLMProviderType,
        stream: flags.stream,
        debug: flags.debug,
        options: this.parseOptions(flags.options || ""),
      };

      if (flags.interactive) {
        await this.startInteractiveMode(agent, options);
      } else {
        const result = await agent.execute(args.message!, options);
        if (!flags.stream && result) {
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
