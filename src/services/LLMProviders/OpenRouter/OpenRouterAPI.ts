/* eslint-disable no-useless-catch */
import { openRouterClient } from "@constants/openRouterClient";
import { ILLMProvider, IMessage } from "@services/LLM/ILLMProvider";
import { MessageContextManager } from "@services/LLM/MessageContextManager";
import { ModelInfo } from "@services/LLM/ModelInfo";
import { ModelScaler } from "@services/LLM/ModelScaler";
import {
  formatMessageContent,
  IMessageContent,
} from "@services/LLM/utils/ModelUtils";
import { DebugLogger } from "@services/logging/DebugLogger";
import { HtmlEntityDecoder } from "@services/text/HTMLEntityDecoder";
import { autoInjectable } from "tsyringe";

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly type: string,
    public readonly details?: any,
  ) {
    super(message);
    this.name = "LLMError";
  }
}

interface IFormattedMessage {
  role: string;
  content: string | IMessageContent[];
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
    private modelScaler: ModelScaler,
    private modelInfo: ModelInfo,
    private debugLogger: DebugLogger,
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

  private async handleLLMError(error: any): Promise<LLMError> {
    if (error?.response?.data) {
      const data = error.response.data;

      if (data.error?.message) {
        return new LLMError(data.error.message, "API_ERROR", data.error);
      }

      if (data.error?.includes("context length")) {
        const model = this.modelScaler.getCurrentModel();
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
      error?.message || "An unknown error occurred",
      "UNKNOWN_ERROR",
      error,
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

  async sendMessage(
    model: string,
    message: string,
    options?: Record<string, unknown>,
  ): Promise<string> {
    const messages = this.getConversationContext();
    const currentModel = this.modelScaler.getCurrentModel() || model;

    try {
      await this.modelInfo.setCurrentModel(currentModel);

      const formattedMessages = this.formatMessages(
        [...messages, { role: "user", content: message }],
        currentModel,
      );

      const response = await this.httpClient.post("/chat/completions", {
        model: currentModel,
        messages: formattedMessages,
        ...options,
      });

      const assistantMessage = response.data.choices[0].message.content;

      this.messageContextManager.addMessage("user", message);
      this.messageContextManager.addMessage("assistant", assistantMessage);

      await this.modelInfo.logCurrentModelUsage(
        this.messageContextManager.getTotalTokenCount(),
      );

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
    await this.modelScaler?.reset();
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
      const cleaned = await this.messageContextManager.cleanupContext();
      if (cleaned) {
        await this.streamMessage(
          this.modelScaler.getCurrentModel(),
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

  private isRetryableError(error: any): boolean {
    if (error instanceof LLMError) {
      return (
        error.type === "NETWORK_ERROR" ||
        error.type === "CONTEXT_LENGTH_EXCEEDED" ||
        error.type === "RATE_LIMIT_EXCEEDED"
      );
    }
    return (
      error.code === "ECONNRESET" ||
      error.code === "ETIMEDOUT" ||
      error.message?.includes("network") ||
      error.message?.includes("timeout")
    );
  }

  private processCompleteMessage(message: string): {
    content: string;
    error?: any;
  } {
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

  private parseStreamChunk(chunk: string): { content: string; error?: any } {
    this.streamBuffer += chunk;

    let content = "";
    let error;

    const messages = this.streamBuffer.split("\n");
    this.streamBuffer = messages.pop() || "";

    for (const message of messages) {
      const result = this.processCompleteMessage(message);
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
    const currentModel = this.modelScaler.getCurrentModel() || model;

    let assistantMessage = "";
    this.streamBuffer = "";

    try {
      await this.modelInfo.setCurrentModel(currentModel);

      const formattedMessages = this.formatMessages(
        [...messages, { role: "user", content: message }],
        currentModel,
      );

      const streamOperation = async () => {
        const response = await this.httpClient.post(
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
            stream.on("data", (chunk: Buffer) => {
              const { content, error } = this.parseStreamChunk(
                chunk.toString(),
              );

              if (error) {
                console.log(JSON.stringify(error, null, 2));
                const llmError = new LLMError(
                  error.message || "Stream error",
                  "STREAM_ERROR",
                  error.details,
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

            stream.on("end", () => {
              if (this.streamBuffer) {
                const { content, error } = this.processCompleteMessage(
                  this.streamBuffer,
                );
                if (error) {
                  console.log(JSON.stringify(error, null, 2));
                  const llmError = new LLMError(
                    error.message || "Stream error",
                    "STREAM_ERROR",
                    error.details,
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

            stream.on("error", (err: any) => {
              reject(err);
            });
          });

          if (assistantMessage) {
            this.messageContextManager.addMessage("user", message);
            this.messageContextManager.addMessage(
              "assistant",
              assistantMessage,
            );

            await this.modelInfo.logCurrentModelUsage(
              this.messageContextManager.getTotalTokenCount(),
            );
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

        await this.modelInfo.logCurrentModelUsage(
          this.messageContextManager.getTotalTokenCount(),
        );
      }
    }
  }
}
