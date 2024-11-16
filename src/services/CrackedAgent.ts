import fs from "fs/promises";
import { ILLMProvider } from "./LLM/ILLMProvider";
import { LLMProvider, LLMProviderType } from "./LLM/LLMProvider";

export interface CrackedAgentOptions {
  root?: string;
  instructionsPath?: string;
  instructions?: string;
  model: string;
  provider?: LLMProviderType;
  stream?: boolean;
  debug?: boolean;
}

export class CrackedAgent {
  private llm: ILLMProvider;
  private options: CrackedAgentOptions;

  constructor(options: CrackedAgentOptions) {
    this.options = {
      root: process.cwd(),
      provider: LLMProviderType.OPENROUTER,
      stream: false,
      debug: false,
      ...options,
    };
    this.llm = LLMProvider.getInstance(
      this.options.provider as LLMProviderType,
    );
  }

  async execute(message: string): Promise<string | void> {
    try {
      // Get instructions content
      let instructionsContent = "";
      if (this.options.instructionsPath) {
        instructionsContent = await this.readInstructionsFile(
          this.options.instructionsPath,
        );
      } else if (this.options.instructions) {
        instructionsContent = this.options.instructions;
      }

      // Validate model
      const isValidModel = await this.llm.validateModel(this.options.model);
      if (!isValidModel) {
        const availableModels = await this.llm.getAvailableModels();
        throw new Error(
          `Invalid model: ${this.options.model}. Available models: ${availableModels.join(", ")}`,
        );
      }

      // Get model info for context
      const modelInfo = await this.llm.getModelInfo(this.options.model);
      if (this.options.debug) {
        console.log(`Using model: ${this.options.model}`);
        console.log(`Model info: ${JSON.stringify(modelInfo, null, 2)}`);
      }

      // Add system instructions if provided
      if (instructionsContent) {
        this.llm.addSystemInstructions(instructionsContent);
      }

      if (this.options.stream) {
        await this.llm.streamMessage(
          this.options.model,
          message,
          (chunk: string) => {
            process.stdout.write(chunk);
          },
        );
        // Add a newline after stream completes
        process.stdout.write("\n");
        return;
      } else {
        const response = await this.llm.sendMessage(
          this.options.model,
          message,
        );
        return response;
      }
    } catch (error) {
      throw error;
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
