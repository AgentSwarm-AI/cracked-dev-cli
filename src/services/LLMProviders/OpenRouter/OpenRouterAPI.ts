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

    try {
      const response = await this.httpClient.post("/chat/completions", data, {
        responseType: "stream",
      });

      for await (const chunk of response.data) {
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) {
          callback(content);
        }
      }

      const fullMessage = { role: "assistant" as const, content: message };
      this.conversationContext.push(fullMessage);
    } catch (error) {
      console.error("Error streaming message:", error);
      throw error;
    }
  }
}
