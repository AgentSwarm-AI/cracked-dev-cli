import { openRouterClient } from "@constants/openRouterClient";
import { ILLMProvider, IMessage } from "@services/LLM/ILLMProvider";
import { MessageContextManager } from "@services/LLM/MessageContextManager";
import { ModelScaler } from "@services/LLM/ModelScaler";
import { IOpenRouterModelInfo } from "@services/LLMProviders/OpenRouter/types/OpenRouterAPITypes";
import { DebugLogger } from "@services/logging/DebugLogger";
import { HtmlEntityDecoder } from "@services/text/HTMLEntityDecoder";
import { autoInjectable } from "tsyringe";

class LLMError extends Error {
  constructor(
    message: string,
    public readonly type: string,
    public readonly details?: any,
  ) {
    super(message);
    this.name = "LLMError";
  }
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
    private debugLogger: DebugLogger,
  ) {
    this.httpClient = openRouterClient;
  }

  private handleLLMError(error: any): LLMError {
    if (error?.response?.data) {
      const data = error.response.data;

      if (data.error?.message?.includes("context length")) {
        return new LLMError(
          "Maximum context length exceeded",
          "CONTEXT_LENGTH_EXCEEDED",
          {
            maxLength: data.error.max_tokens,
            currentLength: data.error.current_tokens,
          },
        );
      }

      if (
        data.error?.type === "rate_limit_exceeded" ||
        data.error?.code === 429
      ) {
        return new LLMError(
          "Rate limit exceeded - continuing with partial response",
          "RATE_LIMIT_EXCEEDED",
          { retryAfter: data.error.retry_after },
        );
      }

      if (data.error?.message?.includes("model")) {
        return new LLMError(
          "Model error occurred - continuing with partial response",
          "MODEL_ERROR",
          { modelId: data.error.model },
        );
      }

      if (data.error?.code === "insufficient_quota") {
        return new LLMError(
          "Insufficient token budget - continuing with partial response",
          "INSUFFICIENT_QUOTA",
          { required: data.error.required, available: data.error.available },
        );
      }

      if (data.error?.message) {
        return new LLMError(data.error.message, "SERVER_ERROR", error);
      }
    }

    if (error.code === "ECONNRESET" || error.code === "ETIMEDOUT") {
      return new LLMError(
        "Network connection error - continuing with partial response",
        "NETWORK_ERROR",
        { code: error.code },
      );
    }

    return new LLMError(
      "An unknown error occurred - continuing with partial response",
      "UNKNOWN_ERROR",
      error,
    );
  }

  async sendMessage(
    model: string,
    message: string,
    options?: Record<string, unknown>,
  ): Promise<string> {
    const messages = this.getConversationContext();
    messages.push({ role: "user", content: message });

    try {
      const response = await this.httpClient.post("/chat/completions", {
        model: this.modelScaler?.getCurrentModel() || model,
        messages,
        ...options,
      });

      const assistantMessage = response.data.choices[0].message.content;

      // Only add messages if they're not duplicates
      this.messageContextManager.addMessage("user", message);
      this.messageContextManager.addMessage("assistant", assistantMessage);

      this.debugLogger?.log("Model", "Using model", {
        model: this.modelScaler?.getCurrentModel(),
      });

      return assistantMessage;
    } catch (error) {
      throw this.handleLLMError(error);
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

  clearConversationContext(): void {
    this.messageContextManager.clear();
    this.modelScaler?.reset();
  }

  getConversationContext(): IMessage[] {
    return this.messageContextManager.getMessages();
  }

  addSystemInstructions(instructions: string): void {
    this.messageContextManager.setSystemInstructions(instructions);
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await this.httpClient.get("/models");
      return response.data.data.map((model: IOpenRouterModelInfo) => model.id);
    } catch (error) {
      throw this.handleLLMError(error);
    }
  }

  async validateModel(model: string): Promise<boolean> {
    const availableModels = await this.getAvailableModels();
    return availableModels.includes(model);
  }

  async getModelInfo(model: string): Promise<Record<string, unknown>> {
    try {
      const response = await this.httpClient.get("/models");
      const modelInfo = response.data.data.find(
        (m: IOpenRouterModelInfo) => m.id === model,
      );
      return modelInfo || {};
    } catch (error) {
      throw this.handleLLMError(error);
    }
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
        return error as unknown as T;
      }
      return this.handleLLMError(error) as unknown as T;
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
        !jsonStr.startsWith("{") ||
        !jsonStr.endsWith("}")
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

  private async handleStreamError(
    error: LLMError,
    message: string,
    callback: (chunk: string, error?: LLMError) => void,
  ): Promise<void> {
    this.debugLogger.log("Model", "Stream error", {
      error: error.type,
      message,
    });
    if (error.type === "CONTEXT_LENGTH_EXCEEDED") {
      // Clean up context and retry
      const cleaned = this.messageContextManager.cleanupContext(
        error.details.maxLength,
      );
      if (cleaned) {
        await this.streamMessage(
          this.modelScaler.getCurrentModel() || "",
          message,
          callback,
        );
        return;
      }
    }

    callback("", error);
  }

  async streamMessage(
    model: string,
    message: string,
    callback: (chunk: string, error?: LLMError) => void,
    options?: Record<string, unknown>,
  ): Promise<void> {
    const messages = this.getConversationContext();
    messages.push({ role: "user", content: message });

    let assistantMessage = "";

    this.streamBuffer = "";

    const streamOperation = async () => {
      const response = await this.httpClient.post(
        "/chat/completions",
        {
          model: this.modelScaler.getCurrentModel() || model,
          messages,
          stream: true,
          ...options,
        },
        {
          responseType: "stream",
          timeout: 0,
        },
      );

      try {
        for await (const chunk of response.data) {
          const { content, error } = this.parseStreamChunk(chunk.toString());

          if (error) {
            const llmError = new LLMError(
              error.message ||
                "Stream error - continuing with partial response",
              "STREAM_ERROR",
              error,
            );
            await this.handleStreamError(llmError, message, callback);
          }

          if (content) {
            assistantMessage += content;
            callback(content);
          }
        }

        if (this.streamBuffer) {
          const { content, error } = this.processCompleteMessage(
            this.streamBuffer,
          );
          if (error) {
            const llmError = new LLMError(
              error.message ||
                "Stream error - continuing with partial response",
              "STREAM_ERROR",
              error,
            );
            await this.handleStreamError(llmError, message, callback);
          }
          if (content) {
            assistantMessage += content;
            callback(content);
          }
        }
      } finally {
        this.streamBuffer = "";
      }

      if (assistantMessage) {
        // Only add messages if they're not duplicates
        this.messageContextManager.addMessage("user", message);
        this.messageContextManager.addMessage("assistant", assistantMessage);
      }
    };

    try {
      await this.retryStreamOperation(streamOperation);
    } catch (error) {
      const llmError =
        error instanceof LLMError ? error : this.handleLLMError(error);
      await this.handleStreamError(llmError, message, callback);

      if (assistantMessage) {
        // Only add messages if they're not duplicates
        this.messageContextManager.addMessage("user", message);
        this.messageContextManager.addMessage("assistant", assistantMessage);
      }
    }
  }
}
