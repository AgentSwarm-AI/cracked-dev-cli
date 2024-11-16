import { autoInjectable, inject } from "tsyringe";
import { openRouterClient } from "../../../constants/openRouterClient";
import { ConversationManager } from "../../LLM/ConversationManager";
import { ILLMProvider, IMessage } from "../../LLM/ILLMProvider";
import {
  IOpenRouterModelInfo,
  IOpenRouterModelsResponse,
} from "./types/OpenRouterAPITypes";

@autoInjectable()
export class OpenRouterAPI implements ILLMProvider {
  private readonly httpClient: typeof openRouterClient;
  private availableModels: IOpenRouterModelInfo[] = [];

  constructor(
    @inject(ConversationManager)
    private conversationManager: ConversationManager,
  ) {
    this.httpClient = openRouterClient;
  }

  private async get<T>(url: string): Promise<T> {
    try {
      const response = await this.httpClient.get<T>(url);
      return response.data;
    } catch (error) {
      console.error("Error fetching data:", error);
      throw error;
    }
  }

  private async post<T>(url: string, data: unknown): Promise<T> {
    try {
      const response = await this.httpClient.post<T>(url, data);
      return response.data;
    } catch (error) {
      console.error("Error posting data:", error);
      throw error;
    }
  }

  async sendMessage(
    model: string,
    message: string,
    options?: Record<string, unknown>,
  ): Promise<string> {
    this.conversationManager.addMessage("user", message);
    const messages = this.conversationManager.getConversationHistory();

    const data = {
      model,
      messages,
      ...options,
    };

    try {
      const response = await this.httpClient.post("/chat/completions", data);
      const assistantMessage = response.data.choices[0].message.content;
      this.conversationManager.addMessage("assistant", assistantMessage);
      return assistantMessage;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
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
    this.conversationManager.clearHistory();
  }

  getConversationContext(): IMessage[] {
    return this.conversationManager.getConversationHistory();
  }

  addSystemInstructions(instructions: string): void {
    this.conversationManager.setSystemInstructions(instructions);
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await this.get<IOpenRouterModelsResponse>("/models");
      this.availableModels = response.data;
      return response.data.map((model) => model.id);
    } catch (error) {
      console.error("Error fetching models:", error.data);
      throw new Error("Failed to fetch available models");
    }
  }

  async validateModel(model: string): Promise<boolean> {
    if (this.availableModels.length === 0) {
      await this.getAvailableModels();
    }
    return this.availableModels.some((m) => m.id === model);
  }

  async getModelInfo(model: string): Promise<Record<string, unknown>> {
    if (this.availableModels.length === 0) {
      await this.getAvailableModels();
    }
    const modelInfo = this.availableModels.find((m) => m.id === model);
    if (!modelInfo) {
      return {};
    }
    return Object.entries(modelInfo).reduce(
      (acc, [key, value]) => {
        acc[key] = value;
        return acc;
      },
      {} as Record<string, unknown>,
    );
  }

  async streamMessage(
    model: string,
    message: string,
    callback: (chunk: string) => void,
    options?: Record<string, unknown>,
  ): Promise<void> {
    this.conversationManager.addMessage("user", message);
    const messages = this.conversationManager.getConversationHistory();

    const data = {
      model,
      messages,
      stream: true,
      ...options,
    };

    let fullContent = "";
    let buffer = "";

    try {
      const response = await this.httpClient.post("/chat/completions", data, {
        responseType: "stream",
        headers: {
          Accept: "text/event-stream",
          "Content-Type": "application/json",
        },
      });

      return new Promise((resolve, reject) => {
        const handleData = async (chunk: Buffer) => {
          try {
            buffer += chunk.toString();
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine || !trimmedLine.startsWith("data: ")) continue;

              const data = trimmedLine.slice(6);
              if (data === "[DONE]") {
                cleanup();
                resolve();
                return;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullContent += content;
                  callback(content);
                }
              } catch (e) {
                // Silently ignore parse errors for incomplete chunks
                continue;
              }
            }
          } catch (error) {
            cleanup();
            reject(error);
          }
        };

        const handleError = (error: Error) => {
          cleanup();
          reject(error);
        };

        const handleEnd = () => {
          if (buffer) {
            try {
              const trimmedBuffer = buffer.trim();
              if (
                trimmedBuffer &&
                trimmedBuffer.startsWith("data: ") &&
                trimmedBuffer !== "data: [DONE]"
              ) {
                const data = trimmedBuffer.slice(6);
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullContent += content;
                  callback(content);
                }
              }
            } catch (e) {
              // Ignore parse errors in final buffer
            }
          }

          this.conversationManager.addMessage("assistant", fullContent);

          cleanup();
          resolve();
        };

        const cleanup = () => {
          response.data.removeListener("data", handleData);
          response.data.removeListener("error", handleError);
          response.data.removeListener("end", handleEnd);
        };

        response.data.on("data", handleData);
        response.data.on("error", handleError);
        response.data.on("end", handleEnd);
      });
    } catch (error) {
      console.error("Error streaming message:", error);
      throw error;
    }
  }
}
