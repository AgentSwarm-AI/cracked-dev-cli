import { Args, Command, Flags } from "@oclif/core";
import fs from "fs/promises";
import { LLMProvider, LLMProviderType } from "../services/LLM/LLMProvider";

export class Crkd extends Command {
  static description = "AI agent for performing operations on local projects";

  static examples = [
    '$ crkd --root ./my-project --instructions ./instructions.md --model gpt-4 "Add error handling"',
    '$ crkd -r ./my-project -i ./instructions.md -m gpt-4 "Create new component"',
  ];

  static flags = {
    root: Flags.string({
      char: "r",
      description: "Root path of the codebase to operate on",
      required: true,
    }),
    instructions: Flags.string({
      char: "i",
      description: "Path to custom instructions file",
      required: true,
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
    const { root, instructions, model, provider, stream } = flags;

    try {
      // Validate inputs
      await this.validateInputs(root, instructions);

      // Read custom instructions
      const customInstructions = await this.readInstructions(instructions);

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
      this.log(`Using model: ${model}`);
      this.log(`Model info: ${JSON.stringify(modelInfo, null, 2)}`);

      // Add system instructions
      llm.addSystemInstructions(customInstructions);

      if (stream) {
        await llm.streamMessage(model, message, (chunk) => {
          process.stdout.write(chunk);
        });
      } else {
        const response = await llm.sendMessage(model, message);
        this.log(response);
      }
    } catch (error) {
      this.error((error as Error).message);
    }
  }

  private async validateInputs(
    root: string,
    instructions: string,
  ): Promise<void> {
    try {
      await fs.access(root);
      await fs.access(instructions);
    } catch {
      throw new Error("Invalid root path or instructions file path");
    }
  }

  private async readInstructions(path: string): Promise<string> {
    try {
      return await fs.readFile(path, "utf-8");
    } catch {
      throw new Error("Failed to read instructions file");
    }
  }
}
