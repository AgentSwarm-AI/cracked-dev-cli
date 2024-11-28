import { ConfigService } from "@services/ConfigService";
import axios, { AxiosInstance } from "axios";
import { container } from "tsyringe";

export const createOpenRouterClient = (baseURL: string): AxiosInstance => {
  const configService = container.resolve(ConfigService);
  const config = configService.getConfig();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.openRouterApiKey}`,
    "Content-Type": "application/json",
  };

  if (config.appUrl) {
    headers["HTTP-Referer"] = config.appUrl;
  }

  if (config.appName) {
    headers["X-Title"] = config.appName;
  }

  return axios.create({
    baseURL,
    // Remove timeout for streaming support
    timeout: 0,
    headers,
    // Add necessary axios config for proper streaming
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });
};

export const openRouterClient = createOpenRouterClient(
  "https://openrouter.ai/api/v1",
);
