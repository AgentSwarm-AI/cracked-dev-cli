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
  clearContext?: boolean;
}

export interface ExecutionResult {
  response: string;
  actions?: Array<{ action: string; result: any }>;
}

@autoInjectable()
export class CrackedAgent {
  private llm!: ILLMProvider;
  private isFirstInteraction: boolean = true;

  constructor(
    private fileReader: FileReader,
    private contextCreator: LLMContextCreator,
    private debugLogger: DebugLogger,
    private actionsParser: ActionsParser,
    private streamHandler: StreamHandler,
  ) {}

  private async setupExecution(options: CrackedAgentOptions) {
    const finalOptions = {
      root: process.cwd(),
      provider: LLMProviderType.OpenRouter,
      stream: false,
      debug: false,
      options: {},
      clearContext: false,
      ...options,
    };

    this.debugLogger.setDebug(finalOptions.debug);
    this.llm = LLMProvider.getInstance(finalOptions.provider);
    this.streamHandler.reset();
    this.actionsParser.reset();

    if (finalOptions.clearContext) {
      this.clearConversationHistory();
    }

    await this.validateModel(finalOptions.model);
    await this.setupInstructions(finalOptions);

    return finalOptions;
  }

  private async validateModel(model: string) {
    const isValidModel = await this.llm.validateModel(model);
    if (!isValidModel) {
      const availableModels = await this.llm.getAvailableModels();
      throw new Error(
        `Invalid model: ${model}. Available models: ${availableModels.join(", ")}`,
      );
    }
  }

  private async setupInstructions(options: CrackedAgentOptions) {
    if (!this.isFirstInteraction) return;

    let instructions = options.instructions;
    if (options.instructionsPath) {
      instructions = await this.fileReader.readInstructionsFile(
        options.instructionsPath,
      );
    }

    if (instructions) {
      this.debugLogger.log("Instructions", "Adding system instructions", {
        instructions,
      });
      this.llm.addSystemInstructions(instructions);
    }
  }

  private async formatMessage(message: string, root: string): Promise<string> {
    const formattedMessage = await this.contextCreator.create(
      message,
      root,
      this.isFirstInteraction,
    );
    this.isFirstInteraction = false;
    return formattedMessage;
  }

  async execute(
    message: string,
    options: CrackedAgentOptions,
  ): Promise<ExecutionResult | void> {
    const finalOptions = await this.setupExecution(options);
    const formattedMessage = await this.formatMessage(
      message,
      finalOptions.root,
    );

    this.debugLogger.log("Message", "Sending formatted message to LLM", {
      message: formattedMessage,
      conversationHistory: this.llm.getConversationContext(),
    });

    if (finalOptions.stream) {
      return this.handleStreamExecution(
        formattedMessage,
        finalOptions.model,
        finalOptions.options,
      );
    }

    return this.handleNormalExecution(
      formattedMessage,
      finalOptions.model,
      finalOptions.options,
    );
  }

  private async handleStreamExecution(
    message: string,
    model: string,
    options?: Record<string, unknown>,
  ): Promise<ExecutionResult> {
    await this.llm.streamMessage(
      model,
      message,
      async (chunk: string) => {
        await this.streamHandler.handleChunk(
          chunk,
          model,
          async (msg) => await this.llm.sendMessage(model, msg, options),
          options,
        );
      },
      options,
    );
    process.stdout.write("\n");

    return {
      response: this.streamHandler.response,
      actions: [],
    };
  }

  private async handleNormalExecution(
    message: string,
    model: string,
    options?: Record<string, unknown>,
  ): Promise<ExecutionResult> {
    const response = await this.llm.sendMessage(model, message, options);

    this.debugLogger.log("Response", "Received LLM response", {
      response,
      conversationHistory: this.llm.getConversationContext(),
    });

    const actionResult = await this.actionsParser.parseAndExecuteActions(
      response,
      model,
      async (msg) => await this.llm.sendMessage(model, msg, options),
    );

    if (actionResult.followupResponse) {
      return {
        response: actionResult.followupResponse,
        actions: actionResult.actions,
      };
    }

    return { response, actions: [] };
  }

  getConversationHistory() {
    return this.llm.getConversationContext();
  }

  clearConversationHistory() {
    this.llm.clearConversationContext();
    this.isFirstInteraction = true;
  }
}
