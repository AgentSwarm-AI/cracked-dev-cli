import { Args, Command, Flags } from "@oclif/core";
import { CrackedAgent } from "../services/CrackedAgent";
import { LLMProviderType } from "../services/LLM/LLMProvider";

export class Crkd extends Command {
  static description = "AI agent for performing operations on local projects";

  static examples = [
    '$ crkd --root ./my-project --instructions-path ./instructions.md --model gpt-4 "Add error handling"',
    '$ crkd -r ./my-project --instructions "Follow clean code" -m gpt-4 "Create component"',
    '$ crkd --instructions "Use TypeScript" -m gpt-4 "Create new component"',
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
      default: LLMProviderType.OPENROUTER,
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
  };

  static args = {
    message: Args.string({
      description: "Message describing the operation to perform",
      required: true,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Crkd);
    const { message } = args;

    try {
      const agent = new CrackedAgent({
        root: flags.root,
        instructionsPath: flags.instructionsPath,
        instructions: flags.instructions,
        model: flags.model,
        provider: flags.provider as LLMProviderType,
        stream: flags.stream,
        debug: flags.debug,
      });

      const response = await agent.execute(message);
      if (!flags.stream && response) {
        this.log(response);
      }
    } catch (error) {
      this.error((error as Error).message);
    }
  }
}
