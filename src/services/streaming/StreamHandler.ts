import { autoInjectable } from "tsyringe";
import { WriteStream } from "tty";
import { ActionsParser } from "../LLM/actions/ActionsParser";
import { DebugLogger } from "../logging/DebugLogger";

export interface StreamCallback {
  (message: string): Promise<string>;
}

@autoInjectable()
export class StreamHandler {
  private responseBuffer: string = "";
  private isStreamComplete: boolean = false;

  constructor(
    private debugLogger: DebugLogger,
    private actionsParser: ActionsParser,
  ) {}

  reset() {
    this.responseBuffer = "";
    this.isStreamComplete = false;
    this.actionsParser.reset();
  }

  get response() {
    return this.responseBuffer;
  }

  private safeWriteToStdout(text: string) {
    try {
      process.stdout.write(text);
    } catch (error) {
      // Ignore write errors in non-TTY environments
    }
  }

  private safeClearLine() {
    try {
      if ((process.stdout as WriteStream).clearLine) {
        (process.stdout as WriteStream).clearLine(0);
      }
    } catch (error) {
      // Ignore clear errors in non-TTY environments
    }
  }

  private safeCursorTo(x: number) {
    try {
      if ((process.stdout as WriteStream).cursorTo) {
        (process.stdout as WriteStream).cursorTo(x);
      }
    } catch (error) {
      // Ignore cursor errors in non-TTY environments
    }
  }

  async handleChunk(
    chunk: string,
    model: string,
    llmCallback: StreamCallback,
    streamCallback: (
      message: string,
      callback: (chunk: string) => void,
    ) => Promise<void>,
    options?: Record<string, unknown>,
  ) {
    this.safeWriteToStdout(chunk);

    this.actionsParser.appendToBuffer(chunk);
    this.responseBuffer += chunk;

    // Check if the message is complete
    if (
      !this.actionsParser.isComplete &&
      this.actionsParser.isCompleteMessage(this.actionsParser.buffer)
    ) {
      this.actionsParser.isComplete = true;
      this.isStreamComplete = true;
      this.debugLogger.log("Status", "Complete message detected", null);
      this.safeWriteToStdout("\n");
    }

    // Only process actions if the stream is complete and we're not already processing
    if (this.isStreamComplete && !this.actionsParser.isProcessing) {
      this.actionsParser.isProcessing = true;
      this.debugLogger.log("Action", "Processing actions", null);

      const actionResult = await this.actionsParser.parseAndExecuteActions(
        this.actionsParser.buffer,
        model,
        async (message) => {
          let actionResponse = "";
          await streamCallback(message, (chunk) => {
            this.safeWriteToStdout(chunk);
            actionResponse += chunk;
          });

          this.responseBuffer += actionResponse;
          return actionResponse;
        },
      );

      // Reset all state after action execution
      this.actionsParser.clearBuffer();
      this.actionsParser.isProcessing = false;
      this.actionsParser.isComplete = false;
      this.isStreamComplete = false;

      // Refresh terminal state for new input
      this.safeWriteToStdout("\n");
      this.safeWriteToStdout("\x1B[?25h"); // Show cursor
      this.safeClearLine();
      this.safeCursorTo(0);
      this.safeWriteToStdout("> "); // Write prompt character immediately

      return actionResult.actions;
    }

    return [];
  }
}
