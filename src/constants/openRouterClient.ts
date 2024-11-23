import { appEnv } from "@config/appEnv";
import { ConfigService } from "@services/ConfigService";
import axios, { AxiosInstance } from "axios";

export const createOpenRouterClient = (baseURL: string): AxiosInstance => {
  const config = ConfigService.loadConfig();

  return axios.create({
    baseURL,
    // Remove timeout for streaming support
    timeout: 0,
    headers: {
      Authorization: `Bearer ${config.openRouterApiKey}`,
      "HTTP-Referer": `${appEnv.APP_URL}`, // Optional, for including your app on openrouter.ai rankings.
      "X-Title": `${appEnv.APP_NAME}`, // Optional. Shows in rankings on openrouter.ai.
      "Content-Type": "application/json",
    },
    // Add necessary axios config for proper streaming
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });
};

export const openRouterClient = createOpenRouterClient(
  "https://openrouter.ai/api/v1",
);
