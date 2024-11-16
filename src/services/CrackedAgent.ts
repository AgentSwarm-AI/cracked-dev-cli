import { autoInjectable } from "tsyringe";
import { FileReader } from "./FileReader";
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

@autoInjectable()
export class CrackedAgent {
  private llm: ILLMProvider;

  constructor(private fileReader: FileReader) {}

  async execute(
    message: string,
    options: CrackedAgentOptions,
  ): Promise<string | void> {
    try {
      const finalOptions = {
        root: process.cwd(),
        provider: LLMProviderType.OpenRouter,
        stream: false,
        debug: false,
        ...options,
      };

      this.llm = LLMProvider.getInstance(finalOptions.provider);

      // Get instructions content
      let instructionsContent = "";
      if (finalOptions.instructionsPath) {
        instructionsContent = await this.fileReader.readInstructionsFile(
          finalOptions.instructionsPath,
        );
      } else if (finalOptions.instructions) {
        instructionsContent = finalOptions.instructions;
      }

      // Validate model
      const isValidModel = await this.llm.validateModel(finalOptions.model);
      if (!isValidModel) {
        const availableModels = await this.llm.getAvailableModels();
        throw new Error(
          `Invalid model: ${finalOptions.model}. Available models: ${availableModels.join(", ")}`,
        );
      }

      // Get model info for context
      const modelInfo = await this.llm.getModelInfo(finalOptions.model);
      if (finalOptions.debug) {
        console.log(`Using model: ${finalOptions.model}`);
        console.log(`Model info: ${JSON.stringify(modelInfo, null, 2)}`);
      }

      // Add system instructions if provided
      if (instructionsContent) {
        this.llm.addSystemInstructions(instructionsContent);
      }

      if (finalOptions.stream) {
        await this.llm.streamMessage(
          finalOptions.model,
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
          finalOptions.model,
          message,
        );
        return response;
      }
    } catch (error) {
      throw error;
    }
  }
}
