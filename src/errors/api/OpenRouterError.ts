import { BaseError } from "../BaseError";

export interface OpenRouterErrorDetails {
  status?: number;
  code?: string;
  path?: string;
}

/**
 * Custom error class for OpenRouter API related errors.
 */
export class OpenRouterError extends BaseError {
  public readonly status?: number;
  public readonly code?: string;
  public readonly path?: string;

  constructor(message: string, details?: OpenRouterErrorDetails) {
    super(message);
    this.status = details?.status;
    this.code = details?.code;
    this.path = details?.path;
  }
}
