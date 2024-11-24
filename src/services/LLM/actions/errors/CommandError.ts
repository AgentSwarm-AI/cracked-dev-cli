export class CommandError extends Error {
  constructor(
    message: string,
    public readonly data?: string,
    public readonly exitCode?: number | null,
  ) {
    super(message);
    this.name = "CommandError";
  }
}
