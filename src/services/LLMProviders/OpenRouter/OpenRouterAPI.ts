import { autoInjectable, inject } from "tsyringe";
import { openRouterClient } from "../../../constants/openRouterClient";
import { ConversationContext } from "../../LLM/ConversationContext";
import { ILLMProvider, IMessage } from "../../LLM/ILLMProvider";
import { HtmlEntityDecoder } from "../../text/HTMLEntityDecoder";
import { IOpenRouterModelInfo } from "./types/OpenRouterAPITypes";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

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

  constructor(
    @inject(ConversationContext)
    private conversationContext: ConversationContext,
    private htmlEntityDecoder: HtmlEntityDecoder,
  ) {
    this.httpClient = openRouterClient;
  }

  private handleLLMError(error: any): LLMError {
    if (error?.response?.data) {
      const data = error.response.data;

      // Handle context length errors
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

      // Handle rate limit errors
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

      // Handle model-specific errors
      if (data.error?.message?.includes("model")) {
        return new LLMError(
          "Model error occurred - continuing with partial response",
          "MODEL_ERROR",
          { modelId: data.error.model },
        );
      }

      // Handle token budget errors
      if (data.error?.code === "insufficient_quota") {
        return new LLMError(
          "Insufficient token budget - continuing with partial response",
          "INSUFFICIENT_QUOTA",
          { required: data.error.required, available: data.error.available },
        );
      }
    }

    // Handle network/timeout errors
    if (error.code === "ECONNRESET" || error.code === "ETIMEDOUT") {
      return new LLMError(
        "Network connection error - continuing with partial response",
        "NETWORK_ERROR",
        { code: error.code },
      );
    }

    // Generic error fallback
    return new LLMError(
      error.message ||
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
        model,
        messages,
        ...options,
      });

      const assistantMessage = response.data.choices[0].message.content;

      this.conversationContext.addMessage("user", message);
      this.conversationContext.addMessage("assistant", assistantMessage);

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
    this.conversationContext.clear();
  }

  getConversationContext(): IMessage[] {
    return this.conversationContext.getMessages();
  }

  addSystemInstructions(instructions: string): void {
    this.conversationContext.setSystemInstructions(instructions);
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

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async retryStreamOperation<T>(
    operation: () => Promise<T>,
    retryCount = 0,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retryCount < MAX_RETRIES && this.isRetryableError(error)) {
        await this.delay(RETRY_DELAY * Math.pow(2, retryCount));
        return this.retryStreamOperation(operation, retryCount + 1);
      }

      // Instead of throwing, return partial response
      if (error instanceof LLMError) {
        return error as unknown as T;
      }
      return this.handleLLMError(error) as unknown as T;
    }
  }

  private isRetryableError(error: any): boolean {
    if (error instanceof LLMError) {
      return error.type === "NETWORK_ERROR";
    }
    return (
      error.code === "ECONNRESET" ||
      error.code === "ETIMEDOUT" ||
      error.message?.includes("network") ||
      error.message?.includes("timeout")
    );
  }

  private parseStreamChunk(chunk: string): { content: string; error?: any } {
    // Handle empty chunks
    if (!chunk.trim()) {
      return { content: "" };
    }

    // Split chunk into lines and process each line
    const lines = chunk.split("\n");
    let content = "";
    let error;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine === "data: [DONE]") continue;

      try {
        // Remove 'data: ' prefix if present
        const jsonStr = trimmedLine.replace(/^data: /, "");

        // Validate JSON structure before parsing
        if (!jsonStr.startsWith("{") || !jsonStr.endsWith("}")) {
          continue; // Skip malformed JSON
        }

        const parsed = JSON.parse(jsonStr);

        // Handle error objects
        if (parsed.error) {
          error = parsed.error;
          continue;
        }

        // Extract content from delta if available
        const deltaContent = parsed.choices?.[0]?.delta?.content;
        if (deltaContent) {
          // Decode HTML entities before adding to content
          content += this.htmlEntityDecoder.decode(deltaContent);
        }
      } catch (e) {
        // Silently skip individual parsing errors
        continue;
      }
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
    messages.push({ role: "user", content: message });

    let assistantMessage = "";
    let lastActivityTimestamp = Date.now();
    const TIMEOUT_THRESHOLD = 30000; // 30 seconds

    const streamOperation = async () => {
      const response = await this.httpClient.post(
        "/chat/completions",
        {
          model,
          messages,
          stream: true,
          ...options,
        },
        {
          responseType: "stream",
          timeout: 120000, // 2 minutes timeout
        },
      );

      const checkTimeout = setInterval(() => {
        if (Date.now() - lastActivityTimestamp > TIMEOUT_THRESHOLD) {
          clearInterval(checkTimeout);
          const error = new LLMError(
            "Stream timeout - continuing with partial response",
            "STREAM_TIMEOUT",
            { threshold: TIMEOUT_THRESHOLD },
          );
          callback("", error);
        }
      }, 5000);

      try {
        let buffer = "";
        for await (const chunk of response.data) {
          lastActivityTimestamp = Date.now();
          buffer += chunk.toString();

          // Process complete messages from buffer
          const lastNewlineIndex = buffer.lastIndexOf("\n");
          if (lastNewlineIndex !== -1) {
            const completeChunks = buffer.substring(0, lastNewlineIndex);
            buffer = buffer.substring(lastNewlineIndex + 1);

            const { content, error } = this.parseStreamChunk(completeChunks);

            if (error) {
              const llmError = new LLMError(
                error.message ||
                  "Stream error - continuing with partial response",
                "STREAM_ERROR",
                error,
              );
              callback("", llmError);
              // Don't throw, continue processing
            }

            if (content) {
              assistantMessage += content;
              callback(content);
            }
          }
        }

        // Process any remaining buffer content
        if (buffer) {
          const { content, error } = this.parseStreamChunk(buffer);
          if (error) {
            const llmError = new LLMError(
              error.message ||
                "Stream error - continuing with partial response",
              "STREAM_ERROR",
              error,
            );
            callback("", llmError);
            // Don't throw, continue with partial response
          }
          if (content) {
            assistantMessage += content;
            callback(content);
          }
        }
      } finally {
        clearInterval(checkTimeout);
      }

      // Always save whatever we got
      if (assistantMessage) {
        this.conversationContext.addMessage("user", message);
        this.conversationContext.addMessage("assistant", assistantMessage);
      }
    };

    try {
      await this.retryStreamOperation(streamOperation);
    } catch (error) {
      // Never throw, always try to continue with partial response
      const llmError =
        error instanceof LLMError ? error : this.handleLLMError(error);
      callback("", llmError);

      // Save partial response if we have any
      if (assistantMessage) {
        this.conversationContext.addMessage("user", message);
        this.conversationContext.addMessage("assistant", assistantMessage);
      }
    }
  }
}
