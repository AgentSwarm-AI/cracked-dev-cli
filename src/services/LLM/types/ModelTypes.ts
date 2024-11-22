export interface IModelArchitecture {
  tokenizer: string;
  instruct_type: string;
  modality: string;
}

export interface IModelPricing {
  prompt: string;
  completion: string;
  request: string;
  image: string;
}

export interface IModelProvider {
  context_length: number;
  max_completion_tokens: number;
  is_moderated: boolean;
}

export interface IModelRequestLimits {
  prompt_tokens: number | null;
  completion_tokens: number | null;
}

export interface IModelInfo {
  id: string;
  name: string;
  created: number;
  description: string;
  pricing: IModelPricing;
  context_length: number;
  architecture: IModelArchitecture;
  top_provider: IModelProvider;
  per_request_limits: IModelRequestLimits;
}
