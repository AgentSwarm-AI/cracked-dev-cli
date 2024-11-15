import { autoInjectable } from 'tsyringe';
import { openRouterClient } from '../constants/openRouterClient';

interface IMessage {
  role: 'user' | 'assistant';
  content: string;
}

@autoInjectable()
export class OpenRouterAPI {
  private readonly httpClient: typeof openRouterClient;
  private conversationContext: IMessage[] = [];

  constructor() {
    this.httpClient = openRouterClient;
  }

  async get<T>(url: string): Promise<T> {
    try {
      const response = await this.httpClient.get<T>(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  }

  async post<T>(url: string, data: unknown): Promise<T> {
    try {
      const response = await this.httpClient.post<T>(url, data);
      return response.data;
    } catch (error) {
      console.error('Error posting data:', error);
      throw error;
    }
  }

  async sendMessage(model: string, message: string): Promise<string> {
    const data = {
      model,
      messages: [
        ...this.conversationContext,
        { role: 'user', content: message },
      ],
    };

    try {
      const response = await this.httpClient.post('/chat/completions', data);
      const assistantMessage = response.data.choices[0].message.content;
      this.conversationContext.push({
        role: 'assistant',
        content: assistantMessage,
      });
      return assistantMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  clearConversationContext(): void {
    this.conversationContext = [];
  }

  getConversationContext(): IMessage[] {
    return this.conversationContext;
  }
}
