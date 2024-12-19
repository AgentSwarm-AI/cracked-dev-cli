/**
 * Base error class for all custom errors in the application.
 * Ensures proper prototype chain and consistent error handling.
 */
export class BaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, this.constructor.prototype);
  }
}
