import { autoInjectable } from "tsyringe";
import { DebugLogger } from "./DebugLogger";
import { FileReader } from "./FileReader";
import { ActionsParser } from "./LLM/actions/ActionsParser";
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

interface StrategyGoal {
  description: string;
  steps: string[];
  considerations: string[];
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

  async execute(
    message: string,
    options: CrackedAgentOptions,
  ): Promise<ExecutionResult | void> {
    const finalOptions = await this.setupExecution(options);

    const formattedMessage = await this.contextCreator.create(
      message,
      finalOptions.root,
      this.isFirstInteraction,
    );

    this.debugLogger.log("Message", "Sending message to LLM", {
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

    const result = await this.handleNormalExecution(
      formattedMessage,
      finalOptions.model,
      finalOptions.options,
    );

    if (this.isFirstInteraction) {
      this.isFirstInteraction = false;
    }

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

    // Add default conversation instructions if none provided
    if (!instructions) {
      const defaultInstructions =
        "You are a helpful AI assistant engaging in conversation with the user. Maintain context of the conversation and provide relevant responses.";
      this.llm.addSystemInstructions(defaultInstructions);
    }
  }

  private async handleStreamExecution(
    message: string,
    model: string,
    options?: Record<string, unknown>,
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

    console.log(`🔍 CrackedAgent: Parsing and executing actions...`);

    const { actions, followupResponse } =
      await this.actionsParser.parseAndExecuteActions(
        this.actionsParser.buffer,
        model,
        async (followupMsg) => {
          // Format followup message to match task format
          const formattedFollowup = await this.contextCreator.create(
            followupMsg,
            process.cwd(),
            false,
          );
          return this.llm.sendMessage(model, formattedFollowup, options);
        },
      );

    console.log(`🔍 CrackedAgent: Actions and followUpResponse: 
        actions: ${actions}
        followUpResponse: ${followupResponse}
        `);

    // If we have a followup response from the LLM after executing actions, use that
    return {
      response: followupResponse || response,
      actions,
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

    const { actions, followupResponse } =
      await this.actionsParser.parseAndExecuteActions(
        response,
        model,
        async (followupMsg) => {
          // Format followup message to match task format
          const formattedFollowup = await this.contextCreator.create(
            followupMsg,
            process.cwd(),
            false,
          );
          return this.llm.sendMessage(model, formattedFollowup, options);
        },
      );

    // If we have a followup response from the LLM after executing actions, use that
    return {
      response: followupResponse || response,
      actions,
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
