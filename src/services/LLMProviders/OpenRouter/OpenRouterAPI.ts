import { autoInjectable, inject } from "tsyringe";
import { openRouterClient } from "../../../constants/openRouterClient";
import { ConversationContext } from "../../LLM/ConversationContext";
import { ILLMProvider, IMessage } from "../../LLM/ILLMProvider";
import { HtmlEntityDecoder } from "../../text/HTMLEntityDecoder";
import { IOpenRouterModelInfo } from "./types/OpenRouterAPITypes";

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

  private async retryStreamOperation<T>(
    operation: () => Promise<T>,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (this.isRetryableError(error)) {
        return await operation();
      }

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

      const unescapedContent =
        this.htmlEntityDecoder.unescapeString(deltaContent);
      const decodedContent = this.htmlEntityDecoder.decode(unescapedContent);

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
          model,
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
            callback("", llmError);
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
            callback("", llmError);
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
        this.conversationContext.addMessage("user", message);
        this.conversationContext.addMessage("assistant", assistantMessage);
      }
    };

    try {
      await this.retryStreamOperation(streamOperation);
    } catch (error) {
      const llmError =
        error instanceof LLMError ? error : this.handleLLMError(error);
      callback("", llmError);

      if (assistantMessage) {
        this.conversationContext.addMessage("user", message);
        this.conversationContext.addMessage("assistant", assistantMessage);
      }
    }
  }
}
