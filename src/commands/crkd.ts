import { Args, Command, Flags } from "@oclif/core";
import fs from "fs/promises";
import { LLMProvider, LLMProviderType } from "../services/LLM/LLMProvider";

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
    const {
      root,
      instructionsPath,
      instructions,
      model,
      provider,
      stream,
      debug,
    } = flags;

    try {
      // Get instructions content
      let instructionsContent = "";
      if (instructionsPath) {
        instructionsContent = await this.readInstructionsFile(instructionsPath);
      } else if (instructions) {
        instructionsContent = instructions;
      }

      // Initialize LLM provider
      const llm = LLMProvider.getInstance(provider as LLMProviderType);

      // Validate model
      const isValidModel = await llm.validateModel(model);
      if (!isValidModel) {
        const availableModels = await llm.getAvailableModels();
        throw new Error(
          `Invalid model: ${model}. Available models: ${availableModels.join(", ")}`,
        );
      }

      // Get model info for context
      const modelInfo = await LLMProvider.getModelInfo(
        provider as LLMProviderType,
        model,
      );
      if (debug) {
        this.log(`Using model: ${model}`);
        this.log(`Model info: ${JSON.stringify(modelInfo, null, 2)}`);
      }

      // Add system instructions if provided
      if (instructionsContent) {
        llm.addSystemInstructions(instructionsContent);
      }

      if (stream) {
        await llm.streamMessage(model, message, (chunk) => {
          process.stdout.write(chunk);
        });
        // Add a newline after stream completes
        process.stdout.write("\n");
      } else {
        const response = await llm.sendMessage(model, message);
        this.log(response);
      }
    } catch (error) {
      this.error((error as Error).message);
    }
  }

  private async readInstructionsFile(path: string): Promise<string> {
    try {
      const stats = await fs.stat(path);
      if (!stats.isFile()) {
        throw new Error("Instructions path must be a file");
      }
      return await fs.readFile(path, "utf-8");
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to read instructions file: ${error.message}`);
      }
      throw error;
    }
  }
}
