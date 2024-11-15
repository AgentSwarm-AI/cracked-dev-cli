import axios, { AxiosInstance } from "axios";
import { appEnv } from "../appEnv";

export const createOpenRouterClient = (baseURL: string): AxiosInstance => {
  return axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      Authorization: `Bearer ${appEnv.OPENROUTER_API_KEY}`,
      "HTTP-Referer": `${appEnv.YOUR_SITE_URL}`, // Optional, for including your app on openrouter.ai rankings.
      "X-Title": `${appEnv.YOUR_SITE_NAME}`, // Optional. Shows in rankings on openrouter.ai.
      "Content-Type": "application/json",
    },
  });
};

export const openRouterClient = createOpenRouterClient(
  "https://openrouter.ai/api/v1",
);
