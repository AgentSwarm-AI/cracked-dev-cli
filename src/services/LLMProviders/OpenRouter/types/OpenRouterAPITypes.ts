export interface IOpenRouterModelArchitecture {
  tokenizer: string;
  instruct_type: string;
  modality: string;
}

export interface IOpenRouterModelPricing {
  prompt: string;
  completion: string;
  request: string;
  image: string;
}

export interface IOpenRouterModelTopProvider {
  context_length: number;
  max_completion_tokens: number;
  is_moderated: boolean;
}

export interface IOpenRouterModelLimits {
  prompt_tokens: number | null;
  completion_tokens: number | null;
}

export interface IOpenRouterModelInfo {
  id: string;
  name: string;
  created: number;
  description: string;
  pricing: IOpenRouterModelPricing;
  context_length: number;
  architecture: IOpenRouterModelArchitecture;
  top_provider: IOpenRouterModelTopProvider;
  per_request_limits: IOpenRouterModelLimits;
}

export interface IOpenRouterModelsResponse {
  data: IOpenRouterModelInfo[];
}

export interface IOpenRouterMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface IOpenRouterOptions {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  repetition_penalty?: number;
  min_p?: number;
  top_a?: number;
  seed?: number;
  max_tokens?: number;
  logit_bias?: Record<number, number>;
  logprobs?: boolean;
  top_logprobs?: number;
  response_format?: { type: string };
  stop?: string[];
  tools?: unknown[];
  tool_choice?: unknown;
}
