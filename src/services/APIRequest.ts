import { autoInjectable } from 'tsyringe';
import { exampleApiClient } from '../constants/axiosClient';

@autoInjectable()
export class APIRequest {
  private readonly httpClient: typeof exampleApiClient;

  constructor() {
    this.httpClient = exampleApiClient;
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

  async put<T>(url: string, data: unknown): Promise<T> {
    try {
      const response = await this.httpClient.put<T>(url, data);
      return response.data;
    } catch (error) {
      console.error('Error putting data:', error);
      throw error;
    }
  }

  async delete<T>(url: string): Promise<T> {
    try {
      const response = await this.httpClient.delete<T>(url);
      return response.data;
    } catch (error) {
      console.error('Error deleting data:', error);
      throw error;
    }
  }
}
