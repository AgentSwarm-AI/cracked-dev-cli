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

  private initializeLLM(provider: LLMProviderType) {
    this.llm = LLMProvider.getInstance(provider);
  }

  private checkTaskCompletion(response: string): string | null {
    const completionMatch = response.match(
      /<task_objective_completed>\s*([\s\S]*?)\s*<\/task_objective_completed>/,
    );
    if (completionMatch) {
      const completionContent = completionMatch[1].trim();
      return `
🎯 Task Objective Completed! 🎉

${completionContent}

✨ Session ended successfully. ✨

-------------------
🔚 Interaction Complete
`;
    }
    return null;
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
      clearContext: false,
      ...options,
    };

    this.debugLogger.setDebug(finalOptions.debug);
    this.initializeLLM(finalOptions.provider);
    this.streamHandler.reset();
    this.actionsParser.reset();

    if (finalOptions.clearContext) {
      this.llm.clearConversationContext();
      this.isFirstInteraction = true;
    }

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

    if (instructionsContent && this.isFirstInteraction) {
      this.debugLogger.log("Instructions", "Adding system instructions", {
        instructions: instructionsContent,
      });
      this.llm.addSystemInstructions(instructionsContent);
    }

    let formattedMessage: string;
    if (this.isFirstInteraction) {
      formattedMessage = await this.contextCreator.create(
        message,
        finalOptions.root,
      );
      this.isFirstInteraction = false;
    } else {
      formattedMessage = message;
    }

    this.debugLogger.log("Message", "Sending formatted message to LLM", {
      message: formattedMessage,
      conversationHistory: this.llm.getConversationContext(),
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

      // Check if task completion was detected in the stream handler
      if (this.streamHandler.response.includes("Task Objective Completed!")) {
        this.clearConversationHistory();
        return { response: this.streamHandler.response, actions: [] };
      }

      return { response: this.streamHandler.response, actions: [] };
    } else {
      const response = await this.llm.sendMessage(
        finalOptions.model,
        formattedMessage,
        finalOptions.options,
      );

      this.debugLogger.log("Response", "Received LLM response", {
        response,
        conversationHistory: this.llm.getConversationContext(),
      });

      const completionMessage = this.checkTaskCompletion(response);
      if (completionMessage) {
        this.clearConversationHistory();
        return { response: completionMessage, actions: [] };
      }

      const actionResult = await this.actionsParser.parseAndExecuteActions(
        response,
        finalOptions.model,
        async (message) => {
          const actionResponse = await this.llm.sendMessage(
            finalOptions.model,
            message,
            finalOptions.options,
          );

          // Check for task completion in action response
          const actionCompletionMessage =
            this.checkTaskCompletion(actionResponse);
          if (actionCompletionMessage) {
            this.clearConversationHistory();
            return actionCompletionMessage;
          }

          return actionResponse;
        },
      );

      if (actionResult.followupResponse) {
        // Check for task completion in followup response
        const followupCompletionMessage = this.checkTaskCompletion(
          actionResult.followupResponse,
        );
        if (followupCompletionMessage) {
          this.clearConversationHistory();
          return {
            response: followupCompletionMessage,
            actions: actionResult.actions,
          };
        }
        return {
          response: actionResult.followupResponse,
          actions: actionResult.actions,
        };
      }

      return { response, actions: [] };
    }
  }

  getConversationHistory() {
    return this.llm.getConversationContext();
  }

  clearConversationHistory() {
    this.llm.clearConversationContext();
    this.isFirstInteraction = true;
  }
}
