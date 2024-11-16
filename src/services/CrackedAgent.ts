import { autoInjectable } from "tsyringe";
import { DebugLogger } from "./DebugLogger";
import { FileReader } from "./FileReader";
import { ActionsParser } from "./LLM/actions/ActionsParser";
import { ILLMProvider } from "./LLM/ILLMProvider";
import { LLMContextCreator } from "./LLM/LLMContextCreator";
import { LLMProvider, LLMProviderType } from "./LLM/LLMProvider";
import {
  DiscoveryCrafter,
  DiscoveryResult,
} from "./LLM/stages/DiscoveryCrafter";
import { StrategyCrafter } from "./LLM/stages/StrategyCrafter";
import { StreamHandler } from "./StreamHandler";
import { TaskStage } from "./TaskManager/TaskStage";

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
  private discoveryResult: DiscoveryResult | null = null;
  private strategyGoals: StrategyGoal[] = [];

  constructor(
    private fileReader: FileReader,
    private contextCreator: LLMContextCreator,
    private debugLogger: DebugLogger,
    private actionsParser: ActionsParser,
    private streamHandler: StreamHandler,
    private strategyCrafter: StrategyCrafter,
    private discoveryCrafter: DiscoveryCrafter,
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

  private async handleDiscoveryStage(
    message: string,
    root: string,
    model: string,
    options?: Record<string, unknown>,
  ): Promise<void> {
    this.debugLogger.log("Discovery", "Starting discovery stage", {
      message,
      root,
    });

    // Initialize discovery phase
    const initialContext = await this.discoveryCrafter.initiateDiscovery(
      message,
      root,
    );
    this.debugLogger.log("Discovery", "Initial context created", {
      initialContext,
    });

    // Get LLM response for discovery
    let response = await this.llm.sendMessage(model, initialContext, options);
    this.debugLogger.log("Discovery", "Initial LLM response received", {
      response,
    });

    // Execute any discovery actions (file reading, etc)
    const actionResults =
      await this.discoveryCrafter.executeDiscoveryActions(response);
    this.debugLogger.log("Discovery", "Action results received", {
      actionResults,
    });

    // If we have file content from actions, send it back to LLM for analysis
    if (actionResults && actionResults.length > 0) {
      const fileContents = actionResults
        .filter((result) => result.success && result.data)
        .map((result) => result.data)
        .join("\n\n");

      if (fileContents) {
        this.debugLogger.log("Discovery", "Sending file contents to LLM", {
          fileContents,
        });

        const contextWithFileContent = `Here's the content of the requested files:\n\n${fileContents}\n\nPlease analyze this content and provide a response with <task_objective_completed> tag and include the relevant information from the files.`;
        response = await this.llm.sendMessage(
          model,
          contextWithFileContent,
          options,
        );

        this.debugLogger.log(
          "Discovery",
          "Received LLM response with file analysis",
          {
            response,
          },
        );
      }
    }

    // Parse discovery results
    this.discoveryResult =
      this.discoveryCrafter.parseDiscoveryResponse(response);

    this.debugLogger.log("Discovery", "Completed discovery stage", {
      discoveryResult: this.discoveryResult,
      isComplete: this.discoveryCrafter.isDiscoveryComplete(response),
      finalResponse: response,
    });

    // Only proceed if discovery is complete
    if (!this.discoveryCrafter.isDiscoveryComplete(response)) {
      throw new Error("Discovery phase incomplete");
    }
  }

  private async handleStrategyStage(
    message: string,
    root: string,
    model: string,
    options?: Record<string, unknown>,
  ): Promise<void> {
    const stagePrompt = this.strategyCrafter.getPromptForStage(
      TaskStage.STRATEGY,
      message,
      "",
    );
    // Don't include environment details in strategy stage
    const formattedMessage = await this.contextCreator.create(
      message,
      root,
      false,
      TaskStage.STRATEGY,
      stagePrompt,
    );

    const response = await this.llm.sendMessage(
      model,
      formattedMessage,
      options,
    );
    this.strategyGoals = this.strategyCrafter.parseStrategyResponse(response);

    this.debugLogger.log("Strategy", "Completed strategy stage", {
      strategyGoals: this.strategyGoals,
    });
  }

  async execute(
    message: string,
    options: CrackedAgentOptions,
  ): Promise<ExecutionResult | void> {
    const finalOptions = await this.setupExecution(options);

    if (this.isFirstInteraction) {
      await this.handleDiscoveryStage(
        message,
        finalOptions.root,
        finalOptions.model,
        finalOptions.options,
      );
      await this.handleStrategyStage(
        message,
        finalOptions.root,
        finalOptions.model,
        finalOptions.options,
      );
      this.isFirstInteraction = false;
    }

    const formattedMessage = await this.contextCreator.create(
      message,
      finalOptions.root,
      false,
    );

    this.debugLogger.log("Message", "Sending formatted message to LLM", {
      message: formattedMessage,
      conversationHistory: this.llm.getConversationContext(),
      currentStage: this.strategyCrafter.getCurrentStage(),
      discoveryResult: this.discoveryResult,
      strategyGoals: this.strategyGoals,
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
          async (msg, callback) =>
            await this.llm.streamMessage(model, msg, callback, options),
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
    this.discoveryResult = null;
    this.strategyGoals = [];
    this.strategyCrafter.resetStage();
  }
}
