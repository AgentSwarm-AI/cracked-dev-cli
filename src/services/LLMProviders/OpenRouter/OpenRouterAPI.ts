import { autoInjectable } from "tsyringe";
import { openRouterClient } from "../../../constants/openRouterClient";
import { ILLMProvider, IMessage } from "../../LLM/ILLMProvider";
import {
  IOpenRouterModelInfo,
  IOpenRouterModelsResponse,
} from "./types/OpenRouterAPITypes";

@autoInjectable()
export class OpenRouterAPI implements ILLMProvider {
  private readonly httpClient: typeof openRouterClient;
  private conversationContext: IMessage[] = [];
  private systemInstructions?: string;
  private availableModels: IOpenRouterModelInfo[] = [];

  constructor() {
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

  async sendMessage(model: string, message: string): Promise<string> {
    const data = {
      model,
      messages: [
        ...this.conversationContext,
        { role: "user", content: message },
      ],
    };

    try {
      const response = await this.httpClient.post("/chat/completions", data);
      const assistantMessage = response.data.choices[0].message.content;
      this.conversationContext.push({
        role: "assistant",
        content: assistantMessage,
      });
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
  ): Promise<string> {
    if (systemInstructions) {
      this.addSystemInstructions(systemInstructions);
    }
    return this.sendMessage(model, message);
  }

  clearConversationContext(): void {
    this.conversationContext = [];
    this.systemInstructions = undefined;
  }

  getConversationContext(): IMessage[] {
    return this.conversationContext;
  }

  addSystemInstructions(instructions: string): void {
    this.systemInstructions = instructions;
    this.conversationContext = [
      { role: "system", content: instructions },
      ...this.conversationContext.filter((msg) => msg.role !== "system"),
    ];
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
    // Convert IOpenRouterModelInfo to Record<string, unknown>
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
  ): Promise<void> {
    const data = {
      model,
      messages: [
        ...this.conversationContext,
        { role: "user", content: message },
      ],
      stream: true,
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

          this.conversationContext.push({
            role: "assistant",
            content: fullContent,
          });

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
