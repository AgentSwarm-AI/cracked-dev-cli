import { autoInjectable } from "tsyringe";
import { FileReader } from "./FileReader";
import { ILLMProvider } from "./LLM/ILLMProvider";
import { LLMContextCreator } from "./LLM/LLMContextCreator";
import { LLMProvider, LLMProviderType } from "./LLM/LLMProvider";

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
  private responseBuffer: string = "";
  private currentMessageBuffer: string = "";
  private processedTags: Set<string> = new Set();
  private isProcessingAction: boolean = false;
  private debug: boolean = false;
  private messageComplete: boolean = false;

  constructor(
    private fileReader: FileReader,
    private contextCreator: LLMContextCreator,
  ) {}

  private initializeLLM(provider: LLMProviderType) {
    this.llm = LLMProvider.getInstance(provider);
  }

  private isCompleteMessage(text: string): boolean {
    const sections = [
      "<strategy>",
      "</strategy>",
      "<next_step>",
      "</next_step>",
    ];

    let lastIndex = -1;
    for (const section of sections) {
      const index = text.indexOf(section);
      if (index === -1 || index < lastIndex) {
        return false;
      }
      lastIndex = index;
    }

    return true;
  }

  private findCompleteTags(text: string): string[] {
    const completeTags: string[] = [];
    const regex =
      /<(read_file|write_file|delete_file|update_file|move_file|copy_file_slice|execute_command|search_string|search_file|edit_code_file)>[\s\S]*?<\/\1>/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const fullTag = match[0];
      if (!this.processedTags.has(fullTag)) {
        completeTags.push(fullTag);
        this.processedTags.add(fullTag);
      }
    }

    return completeTags;
  }

  private debugLog(type: string, message: string, data?: any) {
    if (!this.debug) return;

    const timestamp = new Date().toISOString();
    const divider = "\n" + "═".repeat(100);
    const subDivider = "─".repeat(80);

    // Color codes
    const colors = {
      reset: "\x1b[0m",
      cyan: "\x1b[36m",
      yellow: "\x1b[33m",
      green: "\x1b[32m",
      magenta: "\x1b[35m",
      blue: "\x1b[34m",
    };

    console.log(divider);
    console.log(`${colors.cyan}DEBUG${colors.reset} [${timestamp}]`);
    console.log(`${colors.yellow}${type}${colors.reset}: ${message}`);

    if (data) {
      console.log(`\n${colors.magenta}Data:${colors.reset}`);
      if (typeof data === "object") {
        // Convert escaped newlines to actual newlines and format JSON
        const jsonString = JSON.stringify(data, null, 2)
          .replace(/\\n/g, "\n")
          .split("\n")
          .map((line) => `  ${line}`)
          .join("\n");
        console.log(`${colors.blue}${jsonString}${colors.reset}`);
      } else {
        const formattedData = String(data).replace(/\\n/g, "\n");
        console.log(`${colors.blue}  ${formattedData}${colors.reset}`);
      }
      console.log(subDivider);
    }
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

    this.debug = finalOptions.debug;
    this.initializeLLM(finalOptions.provider);
    this.responseBuffer = "";
    this.currentMessageBuffer = "";
    this.processedTags.clear();
    this.isProcessingAction = false;
    this.messageComplete = false;

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
    this.debugLog("Model Info", "Using model configuration", modelInfo);

    if (instructionsContent) {
      this.debugLog("Instructions", "Adding system instructions", {
        instructions: instructionsContent,
      });
      this.llm.addSystemInstructions(instructionsContent);
    }

    const formattedMessage = await this.contextCreator.create(
      message,
      finalOptions.root,
    );

    this.debugLog("Message", "Sending formatted message to LLM", {
      message: formattedMessage,
    });

    if (finalOptions.stream) {
      await this.llm.streamMessage(
        finalOptions.model,
        formattedMessage,
        async (chunk: string) => {
          process.stdout.write(chunk);

          this.currentMessageBuffer += chunk;
          this.responseBuffer += chunk;

          if (
            !this.messageComplete &&
            this.isCompleteMessage(this.currentMessageBuffer)
          ) {
            this.messageComplete = true;
            this.debugLog("Status", "Complete message detected", null);
          }

          if (this.messageComplete && !this.isProcessingAction) {
            this.isProcessingAction = true;
            this.debugLog("Action", "Processing actions", null);

            const completeTags = this.findCompleteTags(
              this.currentMessageBuffer,
            );
            if (completeTags.length > 0) {
              this.debugLog("Tags", "Found complete action tags", {
                tags: completeTags,
              });

              for (const tag of completeTags) {
                const actions =
                  await this.contextCreator.parseAndExecuteActions(tag);
                if (actions.length > 0) {
                  const actionResults = actions
                    .map(
                      ({ action, result }) =>
                        `[Action Result] ${action}: ${JSON.stringify(result)}`,
                    )
                    .join("\n");

                  if (actionResults) {
                    const followupMessage = `Previous actions have been executed with the following results:\n${actionResults}\nPlease continue with the task.`;
                    this.debugLog(
                      "Action Results",
                      "Sending action results to LLM",
                      {
                        message: followupMessage,
                      },
                    );

                    const followupResponse = await this.llm.sendMessage(
                      finalOptions.model,
                      followupMessage,
                      finalOptions.options,
                    );

                    this.debugLog(
                      "Response",
                      "Received LLM response for action results",
                      {
                        response: followupResponse,
                      },
                    );
                    process.stdout.write(followupResponse);
                    this.responseBuffer += followupResponse;
                  }
                }
              }
            }

            this.currentMessageBuffer = "";
            this.isProcessingAction = false;
          }
        },
        finalOptions.options,
      );
      process.stdout.write("\n");

      return { response: this.responseBuffer, actions: [] };
    } else {
      const response = await this.llm.sendMessage(
        finalOptions.model,
        formattedMessage,
        finalOptions.options,
      );

      this.debugLog("Response", "Received LLM response", { response });

      const actions =
        await this.contextCreator.parseAndExecuteActions(response);

      if (actions.length > 0) {
        const actionResults = actions
          .map(
            ({ action, result }) =>
              `[Action Result] ${action}: ${JSON.stringify(result)}`,
          )
          .join("\n");

        const followupMessage = `Previous actions have been executed with the following results:\n${actionResults}\nPlease continue with the task.`;
        this.debugLog("Action Results", "Sending action results to LLM", {
          message: followupMessage,
        });

        const followupResponse = await this.llm.sendMessage(
          finalOptions.model,
          followupMessage,
          finalOptions.options,
        );

        this.debugLog("Response", "Received LLM response for action results", {
          response: followupResponse,
        });

        return {
          response: response + followupResponse,
          actions,
        };
      }

      return { response, actions };
    }
  }
}
