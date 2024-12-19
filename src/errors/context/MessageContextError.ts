import { BaseError } from "../BaseError";

/**
 * Custom error class for message context related errors.
 */
export class MessageContextError extends BaseError {
  constructor(message: string) {
    super(message);
  }
}
