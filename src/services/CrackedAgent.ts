import { DEFAULT_INSTRUCTIONS } from "@constants/defaultInstructions";
import { FileReader } from "@services/FileManagement/FileReader";
import { ActionsParser } from "@services/LLM/actions/ActionsParser";
import { ILLMProvider } from "@services/LLM/ILLMProvider";
import { LLMContextCreator } from "@services/LLM/LLMContextCreator";
import { LLMProvider, LLMProviderType } from "@services/LLM/LLMProvider";
import { DebugLogger } from "@services/logging/DebugLogger";
import { StreamHandler } from "@services/streaming/StreamHandler";
import { autoInjectable, singleton } from "tsyringe";
import { ModelManager } from "./LLM/ModelManager";
import { PhaseManager } from "./LLM/PhaseManager";

export interface CrackedAgentOptions {
  root?: string;
  timeout: number;
  instructionsPath?: string;
  instructions?: string;
  provider?: LLMProviderType;
  stream?: boolean;
  debug?: boolean;
  options?: Record<string, unknown>;
  clearContext?: boolean;
  autoScaler?: boolean;
}

export interface ExecutionResult {
  response: string;
  actions?: Array<{ action: string; result: any }>;
}

@autoInjectable()
@singleton()
export class CrackedAgent {
  private llm!: ILLMProvider;
  private isFirstInteraction: boolean = true;
  private currentModel: string = "";

  constructor(
    private fileReader: FileReader,
    private contextCreator: LLMContextCreator,
    private debugLogger: DebugLogger,
    private actionsParser: ActionsParser,
    private streamHandler: StreamHandler,
    private phaseManager: PhaseManager,
    private modelManager: ModelManager,
  ) {}

  async execute(
    message: string,
    options: CrackedAgentOptions,
  ): Promise<ExecutionResult> {
    this.phaseManager.initializePhaseConfigs();

    const finalOptions = await this.setupExecution(options);
    this.currentModel = this.modelManager.getCurrentModel();

    const formattedMessage = await this.contextCreator.create(
      message,
      finalOptions.root,
      this.isFirstInteraction,
    );

    // Update isFirstInteraction before returning
    if (this.isFirstInteraction) {
      this.isFirstInteraction = false;
    }

    this.debugLogger.log("Message", "Sending message to LLM", {
      message: formattedMessage,
      conversationHistory: this.llm.getConversationContext(),
    });

    if (finalOptions.stream) {
      return await this.handleStreamExecution(
        formattedMessage,
        this.currentModel,
        finalOptions.options,
        finalOptions.stream,
      );
    }

    const result = await this.handleNormalExecution(
      formattedMessage,
      this.currentModel,
      finalOptions.options,
      finalOptions.stream,
    );

    return result;
  }

  private async setupExecution(options: CrackedAgentOptions) {
    const finalOptions = {
      root: process.cwd(),
      provider: LLMProviderType.OpenRouter,
      stream: false,
      debug: false,
      options: {},
      clearContext: false,
      autoScaler: false,
      ...options,
      timeout: 0,
    };

    this.debugLogger.setDebug(finalOptions.debug);
    this.llm = LLMProvider.getInstance(finalOptions.provider);
    this.streamHandler.reset();
    this.actionsParser.reset();

    if (finalOptions.clearContext) {
      this.clearConversationHistory();
    }

    await this.validateModel(this.modelManager.getCurrentModel());
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

    if (!instructions) {
      this.llm.addSystemInstructions(DEFAULT_INSTRUCTIONS);
    }
  }

  private async handleStreamExecution(
    message: string,
    model: string,
    options?: Record<string, unknown>,
    stream?: boolean,
  ): Promise<ExecutionResult> {
    let response = "";
    await this.llm.streamMessage(
      model,
      message,
      async (chunk: string) => {
        response += chunk;
        this.actionsParser.appendToBuffer(chunk);
        process.stdout.write(chunk);
      },
      options,
    );
    process.stdout.write("\n");

    if (!response) return { response: "" };

    const { actions = [], followupResponse } =
      await this.parseAndExecuteWithCallback(
        this.actionsParser.buffer,
        model,
        options,
        stream,
      );

    return {
      response: followupResponse || response,
      actions,
    };
  }

  private async handleNormalExecution(
    message: string,
    model: string,
    options?: Record<string, unknown>,
    stream?: boolean,
  ): Promise<ExecutionResult> {
    const response = await this.llm.sendMessage(model, message, options);

    this.debugLogger.log("Response", "Received LLM response", {
      response,
      conversationHistory: this.llm.getConversationContext(),
    });

    if (!response) return { response: "" };

    const { actions = [], followupResponse } =
      await this.parseAndExecuteWithCallback(response, model, options, stream);

    return {
      response: followupResponse || response,
      actions,
    };
  }

  private async parseAndExecuteWithCallback(
    response: string,
    model: string,
    options?: Record<string, unknown>,
    stream?: boolean,
  ): Promise<{
    actions: Array<{ action: string; result: any }>;
    followupResponse?: string;
  }> {
    this.actionsParser.reset();
    const result = await this.actionsParser.parseAndExecuteActions(
      response,
      model,
      async (followupMsg: string) => {
        const formattedFollowup = await this.contextCreator.create(
          followupMsg,
          process.cwd(),
          false,
        );

        if (stream) {
          let followupResponse = "";
          await this.llm.streamMessage(
            this.currentModel,
            formattedFollowup,
            async (chunk: string) => {
              followupResponse += chunk;
              process.stdout.write(chunk);
            },
            options,
          );
          process.stdout.write("\n");

          const followupResult = await this.parseAndExecuteWithCallback(
            followupResponse,
            this.currentModel,
            options,
            stream,
          );

          return followupResult.followupResponse || followupResponse;
        } else {
          const followupResponse = await this.llm.sendMessage(
            this.currentModel,
            formattedFollowup,
            options,
          );

          const followupResult = await this.parseAndExecuteWithCallback(
            followupResponse,
            this.currentModel,
            options,
            stream,
          );

          return followupResult.followupResponse || followupResponse;
        }
      },
    );

    return {
      actions: result?.actions || [],
      followupResponse: result?.followupResponse,
    };
  }

  getConversationHistory() {
    return this.llm.getConversationContext();
  }

  clearConversationHistory() {
    this.llm.clearConversationContext();
    this.isFirstInteraction = true;
  }
}
