import { autoInjectable } from "tsyringe";
import { ActionsParser } from "./ActionsParser";
import { DebugLogger } from "./DebugLogger";
import { FileReader } from "./FileReader";
import { ILLMProvider } from "./LLM/ILLMProvider";
import { LLMContextCreator } from "./LLM/LLMContextCreator";
import { LLMProvider, LLMProviderType } from "./LLM/LLMProvider";
import { StreamHandler } from "./StreamHandler";

export interface CrackedAgentOptions {
  root?: string;
  instructionsPath?: string;
  instructions?: string;
  model: string;
  provider?: LLMProviderType;
  stream?: boolean;
  debug?: boolean;
  options?: Record<string, unknown>;
}

export interface ExecutionResult {
  response: string;
  actions?: Array<{ action: string; result: any }>;
}

@autoInjectable()
export class CrackedAgent {
  private llm!: ILLMProvider;

  constructor(
    private fileReader: FileReader,
    private contextCreator: LLMContextCreator,
    private debugLogger: DebugLogger,
    private actionsParser: ActionsParser,
    private streamHandler: StreamHandler,
  ) {}

  private initializeLLM(provider: LLMProviderType) {
    this.llm = LLMProvider.getInstance(provider);
  }

  async execute(
    message: string,
    options: CrackedAgentOptions,
  ): Promise<ExecutionResult | void> {
    const finalOptions = {
      root: process.cwd(),
      provider: LLMProviderType.OpenRouter,
      stream: false,
      debug: false,
      options: {},
      ...options,
    };

    this.debugLogger.setDebug(finalOptions.debug);
    this.initializeLLM(finalOptions.provider);
    this.streamHandler.reset();
    this.actionsParser.reset();

    let instructionsContent = "";
    if (finalOptions.instructionsPath) {
      instructionsContent = await this.fileReader.readInstructionsFile(
        finalOptions.instructionsPath,
      );
    } else if (finalOptions.instructions) {
      instructionsContent = finalOptions.instructions;
    }

    const isValidModel = await this.llm.validateModel(finalOptions.model);
    if (!isValidModel) {
      const availableModels = await this.llm.getAvailableModels();
      throw new Error(
        `Invalid model: ${finalOptions.model}. Available models: ${availableModels.join(", ")}`,
      );
    }

    const modelInfo = await this.llm.getModelInfo(finalOptions.model);
    this.debugLogger.log("Model Info", "Using model configuration", modelInfo);

    if (instructionsContent) {
      this.debugLogger.log("Instructions", "Adding system instructions", {
        instructions: instructionsContent,
      });
      this.llm.addSystemInstructions(instructionsContent);
    }

    const formattedMessage = await this.contextCreator.create(
      message,
      finalOptions.root,
    );

    this.debugLogger.log("Message", "Sending formatted message to LLM", {
      message: formattedMessage,
    });

    if (finalOptions.stream) {
      await this.llm.streamMessage(
        finalOptions.model,
        formattedMessage,
        async (chunk: string) => {
          await this.streamHandler.handleChunk(
            chunk,
            finalOptions.model,
            async (message) => {
              return await this.llm.sendMessage(
                finalOptions.model,
                message,
                finalOptions.options,
              );
            },
            finalOptions.options,
          );
        },
        finalOptions.options,
      );
      process.stdout.write("\n");

      return { response: this.streamHandler.response, actions: [] };
    } else {
      const response = await this.llm.sendMessage(
        finalOptions.model,
        formattedMessage,
        finalOptions.options,
      );

      this.debugLogger.log("Response", "Received LLM response", { response });

      const actions = await this.actionsParser.parseAndExecuteActions(
        response,
        finalOptions.model,
        async (message) => {
          return await this.llm.sendMessage(
            finalOptions.model,
            message,
            finalOptions.options,
          );
        },
      );

      if (actions.length > 0) {
        return {
          response: this.streamHandler.response || response,
          actions,
        };
      }

      return { response, actions: [] };
    }
  }
}
