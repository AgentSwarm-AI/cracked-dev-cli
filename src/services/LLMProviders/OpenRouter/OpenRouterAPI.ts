import { autoInjectable, inject } from "tsyringe";
import { openRouterClient } from "../../../constants/openRouterClient";
import { ConversationContext } from "../../LLM/ConversationContext";
import { ILLMProvider, IMessage } from "../../LLM/ILLMProvider";
import { IOpenRouterModelInfo } from "./types/OpenRouterAPITypes";

@autoInjectable()
export class OpenRouterAPI implements ILLMProvider {
  private readonly httpClient: typeof openRouterClient;

  constructor(
    @inject(ConversationContext)
    private conversationContext: ConversationContext,
  ) {
    this.httpClient = openRouterClient;
  }

  async sendMessage(
    model: string,
    message: string,
    options?: Record<string, unknown>,
  ): Promise<string> {
    console.log("sendMessage", model, message, options);

    const messages = this.getConversationContext();
    messages.push({ role: "user", content: message });

    try {
      const response = await this.httpClient.post("/chat/completions", {
        model,
        messages,
        ...options,
      });

      const assistantMessage = response.data.choices[0].message.content;

      console.log(assistantMessage);

      this.conversationContext.addMessage("user", message);
      this.conversationContext.addMessage("assistant", assistantMessage);

      return assistantMessage;
    } catch (error) {
      console.error("Error in sendMessage:", error);
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
      console.error("Error fetching models:", error);
      return [];
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
      console.error("Error fetching model info:", error);
      return {};
    }
  }

  async streamMessage(
    model: string,
    message: string,
    callback: (chunk: string) => void,
    options?: Record<string, unknown>,
  ): Promise<void> {
    const messages = this.getConversationContext();
    messages.push({ role: "user", content: message });

    try {
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
        },
      );

      let assistantMessage = "";
      let buffer = "";

      for await (const chunk of response.data) {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine === "data: [DONE]") continue;

          try {
            const cleanedLine = trimmedLine.replace(/^data: /, "");
            const parsed = JSON.parse(cleanedLine);
            const content = parsed.choices[0]?.delta?.content || "";
            if (content) {
              assistantMessage += content;
              callback(content);
            }
          } catch (error) {
            // Silently skip malformed JSON chunks
            continue;
          }
        }
      }

      this.conversationContext.addMessage("user", message);
      this.conversationContext.addMessage("assistant", assistantMessage);
    } catch (error) {
      console.error("Error in streamMessage:", error);
      throw error;
    }
  }
}
