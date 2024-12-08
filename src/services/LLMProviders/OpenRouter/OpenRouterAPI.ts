/* eslint-disable no-useless-catch */
import { openRouterClient } from "@constants/openRouterClient";
import { ILLMProvider, IMessage } from "@services/LLM/ILLMProvider";
import { MessageContextManager } from "@services/LLM/MessageContextManager";
import { ModelInfo } from "@services/LLM/ModelInfo";
import { ModelManager } from "@services/LLM/ModelManager";
import { ModelScaler } from "@services/LLM/ModelScaler";
import {
  formatMessageContent,
  IMessageContent,
  isAnthropicModel,
} from "@services/LLM/utils/ModelUtils";
import { DebugLogger } from "@services/logging/DebugLogger";
import { HtmlEntityDecoder } from "@services/text/HTMLEntityDecoder";
import { autoInjectable } from "tsyringe";

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly type: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "LLMError";
  }
}

interface IFormattedMessage {
  role: string;
  content: string | IMessageContent[];
}

interface IStreamError {
  message?: string;
  details?: Record<string, unknown>;
}

interface PriceInfo {
  prompt: string;
  completion: string;
  image: string;
  request: string;
}

interface UsageEntry {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface UsageHistory {
  [modelName: string]: UsageEntry[];
}

@autoInjectable()
export class OpenRouterAPI implements ILLMProvider {
  private readonly httpClient: typeof openRouterClient;
  private streamBuffer: string = "";
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  constructor(
    private messageContextManager: MessageContextManager,
    private htmlEntityDecoder: HtmlEntityDecoder,
    private modelManager: ModelManager,
    private modelInfo: ModelInfo,
    private debugLogger: DebugLogger,
    private modelScaler: ModelScaler,
  ) {
    this.httpClient = openRouterClient;
    this.initializeModelInfo();
  }

  private async initializeModelInfo(): Promise<void> {
    try {
      await this.modelInfo.initialize();
    } catch (error) {
      this.debugLogger.log("Model", "Failed to initialize model info", {
        error,
      });
    }
  }

  private getAnthropicHeaders(model: string): Record<string, string> {
    if (!isAnthropicModel(model)) {
      return {};
    }

    return {
      "anthropic-beta": "prompt-caching-2024-07-31",
      "anthropic-version": "2023-06-01",
    };
  }

  private async makeRequest(
    endpoint: string,
    data: any,
    options: any = {},
  ): Promise<any> {
    const model = data.model;
    const headers = this.getAnthropicHeaders(model);

    return this.httpClient.post(endpoint, data, {
      ...options,
      headers: {
        ...options.headers,
        ...headers,
      },
    });
  }

  private async handleLLMError(
    error: Error | LLMError | unknown,
  ): Promise<LLMError> {
    if ((error as any)?.response?.data) {
      const data = (error as any).response.data;

      if (data.error?.message) {
        return new LLMError(data.error.message, "API_ERROR", data.error);
      }

      if (
        typeof data.error === "string" &&
        data.error.includes("context length")
      ) {
        const model = this.modelManager.getCurrentModel();
        const contextLimit = await this.modelInfo.getModelContextLength(model);
        return new LLMError(
          "Maximum context length exceeded",
          "CONTEXT_LENGTH_EXCEEDED",
          {
            maxLength: contextLimit,
            currentLength: this.messageContextManager.getTotalTokenCount(),
          },
        );
      }
    }

    if (error instanceof LLMError) {
      return error;
    }

    return new LLMError(
      (error as Error)?.message || "An unknown error occurred",
      "UNKNOWN_ERROR",
      { originalError: error },
    );
  }

  private formatMessages(
    messages: IMessage[],
    model: string,
  ): IFormattedMessage[] {
    // Filter out messages with empty content before formatting
    const filteredMessages = messages.filter(
      (msg) => msg.content?.trim().length > 0,
    );

    return filteredMessages.map((msg, index) => ({
      role: msg.role,
      content: formatMessageContent(
        msg.content,
        model,
        index,
        filteredMessages.length,
      ),
    }));
  }

  private calculateCosts(priceAll: PriceInfo, usage: UsageHistory) {
    const promptRate = parseFloat(priceAll.prompt);
    const completionRate = parseFloat(priceAll.completion);

    let currentCost = 0;
    let totalCost = 0;

    for (const modelKey in usage) {
      const modelUsage = usage[modelKey];
      if (modelUsage.length > 0) {
        // Calculate total cost for the model
        const modelTotalCost = modelUsage.reduce((sum, entry) => {
          const cost =
            entry.prompt_tokens * promptRate +
            entry.completion_tokens * completionRate;
          return sum + cost;
        }, 0);

        totalCost += modelTotalCost;

        // Calculate current cost (last usage entry for the model)
        const lastUsage = modelUsage[modelUsage.length - 1];
        currentCost =
          lastUsage.prompt_tokens * promptRate +
          lastUsage.completion_tokens * completionRate;
      }
    }

    return {
      currentCost,
      totalCost,
    };
  }

  private logChatCosts(
    priceAll: PriceInfo | undefined,
    usage: UsageHistory,
  ): void {
    if (priceAll && usage) {
      const { currentCost, totalCost } = this.calculateCosts(priceAll, usage);

      console.log("Current Chat Cost: $", currentCost.toFixed(10));
      console.log("Total Chat Cost:   $", totalCost.toFixed(10));
    } else {
      console.log(
        "PriceInfo or UsageHistory is undefined, cannot calculate costs.",
      );
    }
  }

  async sendMessage(
    model: string,
    message: string,
    options?: Record<string, unknown>,
  ): Promise<string> {
    const messages = this.getConversationContext();
    const currentModel = this.modelManager.getCurrentModel() || model;

    try {
      await this.modelInfo.setCurrentModel(currentModel);

      const formattedMessages = this.formatMessages(
        [...messages, { role: "user", content: message }],
        currentModel,
      );

      const response = await this.makeRequest("/chat/completions", {
        model: currentModel,
        messages: formattedMessages,
        ...options,
      });

      const assistantMessage = response.data.choices[0].message.content;

      this.messageContextManager.addMessage("user", message);
      this.messageContextManager.addMessage("assistant", assistantMessage);

      const priceAll = this.modelInfo.getCurrentModelInfo()?.pricing;
      const usage = this.modelInfo.getUsageHistory();
      this.logChatCosts(priceAll, usage);

      return assistantMessage;
    } catch (error) {
      throw await this.handleLLMError(error);
    }
  }

  async sendMessageWithContext(
    model: string,
    message: string,
    systemInstructions?: string,
    options?: Record<string, unknown>,
  ): Promise<string> {
    if (systemInstructions) {
      this.addSystemInstructions(systemInstructions);
    }
    return this.sendMessage(model, message, options);
  }

  async clearConversationContext(): Promise<void> {
    this.messageContextManager.clear();
  }

  getConversationContext(): IMessage[] {
    return this.messageContextManager.getMessages();
  }

  addSystemInstructions(instructions: string): void {
    this.messageContextManager.setSystemInstructions(instructions);
    this.modelInfo.logCurrentModelUsage(
      this.messageContextManager.getTotalTokenCount(),
    );
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      await this.modelInfo.initialize();
      return this.modelInfo.getAllModels();
    } catch (error) {
      throw await this.handleLLMError(error);
    }
  }

  async validateModel(model: string): Promise<boolean> {
    return this.modelInfo.isModelAvailable(model);
  }

  async getModelInfo(model: string): Promise<Record<string, unknown>> {
    const info = await this.modelInfo.getModelInfo(model);
    return info ? ({ ...info } as Record<string, unknown>) : {};
  }

  private async handleStreamError(
    error: LLMError,
    message: string,
    callback: (chunk: string, error?: LLMError) => void,
  ): Promise<void> {
    console.log(JSON.stringify(error, null, 2));

    this.debugLogger.log("Model", "Stream error", {
      error: error.type,
      message,
    });

    if (error.type === "CONTEXT_LENGTH_EXCEEDED") {
      const wasContextCleaned =
        await this.messageContextManager.cleanupContext();
      if (wasContextCleaned) {
        await this.streamMessage(
          this.modelManager.getCurrentModel(),
          message,
          callback,
        );
        return;
      }
    }

    callback("", error);
  }

  private async retryStreamOperation<T>(
    operation: () => Promise<T>,
    retries: number = this.maxRetries,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        return this.retryStreamOperation(operation, retries - 1);
      }

      if (error instanceof LLMError) {
        throw error;
      }
      throw await this.handleLLMError(error);
    }
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof LLMError) {
      return (
        error.type === "NETWORK_ERROR" ||
        error.type === "CONTEXT_LENGTH_EXCEEDED" ||
        error.type === "RATE_LIMIT_EXCEEDED"
      );
    }
    const err = error as { code?: string; message?: string };
    return !!(
      err.code === "ECONNRESET" ||
      err.code === "ETIMEDOUT" ||
      err.message?.includes("network") ||
      err.message?.includes("timeout")
    );
  }

  private async processCompleteMessage(message: string): Promise<{
    content: string;
    error?: IStreamError;
  }> {
    try {
      const jsonStr = message.replace(/^data: /, "").trim();
      if (
        !jsonStr ||
        jsonStr === "[DONE]" ||
        (!jsonStr.startsWith("{") && !jsonStr.startsWith("data: {"))
      ) {
        return { content: "" };
      }

      const parsed = JSON.parse(jsonStr);

      if (parsed.error) {
        return { content: "", error: parsed.error };
      }

      if (parsed.usage) {
        await this.modelInfo.logDetailedUsage(parsed.usage);
      }

      const deltaContent = parsed.choices?.[0]?.delta?.content;
      if (!deltaContent) {
        return { content: "" };
      }

      const decodedContent = this.htmlEntityDecoder.decode(deltaContent);

      return { content: decodedContent };
    } catch (e) {
      this.debugLogger.log("Error", "Error parsing stream chunk", { error: e });
      return { content: "" };
    }
  }

  private async parseStreamChunk(chunk: string): Promise<{
    content: string;
    error?: IStreamError;
  }> {
    this.streamBuffer += chunk;

    let content = "";
    let error;

    const messages = this.streamBuffer.split("\n");
    this.streamBuffer = messages.pop() || "";

    for (const message of messages) {
      const result = await this.processCompleteMessage(message);
      if (result.error) error = result.error;
      content += result.content;
    }

    return { content, error };
  }

  async streamMessage(
    model: string,
    message: string,
    callback: (chunk: string, error?: LLMError) => void,
    options?: Record<string, unknown>,
  ): Promise<void> {
    const messages = this.getConversationContext();
    const currentModel = this.modelManager.getCurrentModel() || model;

    let assistantMessage = "";
    this.streamBuffer = "";

    try {
      await this.modelInfo.setCurrentModel(currentModel);

      const formattedMessages = this.formatMessages(
        [...messages, { role: "user", content: message }],
        currentModel,
      );

      const streamOperation = async () => {
        const response = await this.makeRequest(
          "/chat/completions",
          {
            model: currentModel,
            messages: formattedMessages,
            stream: true,
            ...options,
          },
          {
            responseType: "stream",
            timeout: 0,
          },
        );

        try {
          const stream = response.data;

          await new Promise<void>((resolve, reject) => {
            stream.on("data", async (chunk: Buffer) => {
              const { content, error } = await this.parseStreamChunk(
                chunk.toString(),
              );

              if (error) {
                console.log(JSON.stringify(error, null, 2));
                const llmError = new LLMError(
                  error.message || "Stream error",
                  "STREAM_ERROR",
                  error.details || {},
                );
                this.handleStreamError(llmError, message, callback);
                reject(llmError);
                return;
              }

              if (content) {
                assistantMessage += content;
                callback(content);
              }
            });

            stream.on("end", async () => {
              if (this.streamBuffer) {
                const { content, error } = await this.parseStreamChunk(
                  this.streamBuffer,
                );
                if (error) {
                  console.log(JSON.stringify(error, null, 2));
                  const llmError = new LLMError(
                    error.message || "Stream error",
                    "STREAM_ERROR",
                    error.details || {},
                  );
                  this.handleStreamError(llmError, message, callback);
                  reject(llmError);
                  return;
                }
                if (content) {
                  assistantMessage += content;
                  callback(content);
                }
              }
              resolve();
            });

            stream.on("error", (err: Error) => {
              reject(err);
            });
          });

          if (assistantMessage) {
            this.messageContextManager.addMessage("user", message);
            this.messageContextManager.addMessage(
              "assistant",
              assistantMessage,
            );

            const priceAll = this.modelInfo.getCurrentModelInfo()?.pricing;
            const usage = this.modelInfo.getUsageHistory();
            this.logChatCosts(priceAll, usage);
          }
        } catch (error) {
          throw error;
        } finally {
          this.streamBuffer = "";
        }
      };

      await this.retryStreamOperation(streamOperation);
    } catch (error) {
      const llmError =
        error instanceof LLMError ? error : await this.handleLLMError(error);
      await this.handleStreamError(llmError, message, callback);

      if (assistantMessage) {
        this.messageContextManager.addMessage("user", message);
        this.messageContextManager.addMessage("assistant", assistantMessage);

        const priceAll = this.modelInfo.getCurrentModelInfo()?.pricing;
        const usage = this.modelInfo.getUsageHistory();
        this.logChatCosts(priceAll, usage);
      }
    }
  }
}
