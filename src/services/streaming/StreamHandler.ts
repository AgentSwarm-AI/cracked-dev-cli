/**
 * StreamHandler manages and processes streaming data chunks, handles errors, and triggers action execution based on the parsed content.
 * It ensures that the stream is handled efficiently and that any actions within the stream are executed correctly.
 */ import { ActionsParser } from "@services/LLM/actions/ActionsParser";
import { DebugLogger } from "@services/logging/DebugLogger";
import { autoInjectable } from "tsyringe";
import { WriteStream } from "tty";

export interface StreamCallback {
  (message: string): Promise<string>;
}

export interface StreamChunkCallback {
  (chunk: string, error?: LLMError): void;
}

interface ErrorDisplay {
  title: string;
  details: string;
  suggestion?: string;
}

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly type: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "LLMError";
  }
}

@autoInjectable()
export class StreamHandler {
  private responseBuffer: string = "";
  private isStreamComplete: boolean = false;
  private lastActivityTimestamp: number = Date.now();

  constructor(
    private debugLogger: DebugLogger,
    private actionsParser: ActionsParser,
  ) {}

  reset() {
    this.responseBuffer = "";
    this.isStreamComplete = false;
    this.lastActivityTimestamp = Date.now();
    this.actionsParser.reset();
  }

  get response() {
    return this.responseBuffer;
  }

  private formatErrorDisplay(error: LLMError): ErrorDisplay {
    if (!error)
      return { title: "Unknown Error", details: "An unknown error occurred" };

    switch (error.type) {
      case "CONTEXT_LENGTH_EXCEEDED":
        return {
          title: "Context Length Exceeded",
          details: `Maximum context length (${error.details?.maxLength} tokens) exceeded. Current length: ${error.details?.currentLength} tokens.`,
          suggestion:
            "Try reducing the conversation history or splitting your request into smaller chunks.",
        };
      case "RATE_LIMIT_EXCEEDED":
        return {
          title: "Rate Limit Exceeded",
          details: `API rate limit reached.${error.details?.retryAfter ? ` Try again in ${error.details.retryAfter} seconds.` : ""}`,
          suggestion: "Please wait before making another request.",
        };
      case "MODEL_ERROR":
        return {
          title: "Model Error",
          details: `Error with model${error.details?.modelId ? ` ${error.details.modelId}` : ""}: ${error.message}`,
          suggestion:
            "Try using a different model or reducing the complexity of your request.",
        };
      case "INSUFFICIENT_QUOTA":
        return {
          title: "Insufficient Token Budget",
          details: `Required: ${error.details?.required}, Available: ${error.details?.available}`,
          suggestion: "Please check your API quota or upgrade your plan.",
        };
      case "NETWORK_ERROR":
        return {
          title: "Network Error",
          details: error.message,
          suggestion: "Check your internet connection and try again.",
        };
      case "STREAM_TIMEOUT":
        return {
          title: "Stream Timeout",
          details: "The stream was inactive for too long.",
          suggestion:
            "Try your request again. If the issue persists, try reducing the complexity of your request.",
        };
      case "STREAM_ERROR":
        return {
          title: "Stream Error",
          details: error.message,
          suggestion:
            "Try your request again with a different prompt or model.",
        };
      default:
        return {
          title: "Error",
          details: error.message || "An unexpected error occurred",
          suggestion:
            "Try your request again. If the issue persists, try with different parameters.",
        };
    }
  }

  private displayError(error: LLMError) {
    const { title, details, suggestion } = this.formatErrorDisplay(error);

    this.safeWriteToStdout("\n\n");
    this.safeWriteToStdout("\x1b[31m");
    this.safeWriteToStdout(`❌ ${title}\n`);
    this.safeWriteToStdout("\x1b[0m");

    this.safeWriteToStdout("\x1b[37m");
    this.safeWriteToStdout(`${details}\n`);

    if (suggestion) {
      this.safeWriteToStdout("\n");
      this.safeWriteToStdout("\x1b[36m");
      this.safeWriteToStdout(`💡 ${suggestion}\n`);
    }

    this.safeWriteToStdout("\x1b[0m");
    this.safeWriteToStdout("\n");
  }

  private safeWriteToStdout(text: string) {
    try {
      process.stdout.write(text);
    } catch (error) {
      console.error("Error writing to stdout", error);
    }
  }

  private safeClearLine() {
    try {
      if ((process.stdout as WriteStream).clearLine) {
        (process.stdout as WriteStream).clearLine(0);
      }
    } catch (error) {
      console.error("Error clearing line", error);
    }
  }

  private safeCursorTo(x: number) {
    try {
      if ((process.stdout as WriteStream).cursorTo) {
        (process.stdout as WriteStream).cursorTo(x);
      }
    } catch (error) {
      console.error("Error moving cursor", error);
    }
  }

  async handleChunk(
    chunk: string,
    model: string,
    llmCallback: StreamCallback,
    streamCallback: (
      message: string,
      callback: StreamChunkCallback,
    ) => Promise<void>,
    options?: Record<string, unknown>,
  ) {
    this.lastActivityTimestamp = Date.now();

    if (chunk.startsWith('{"error":')) {
      try {
        const error = JSON.parse(chunk).error;
        const llmError = new LLMError(
          error.message || "Unknown error",
          error.type || "UNKNOWN_ERROR",
          error.details,
        );
        this.displayError(llmError);
        return [];
      } catch (e) {
        this.displayError(
          new LLMError("Unknown error", "UNKNOWN_ERROR", { originalError: e }),
        );
        return [];
      }
    }

    this.safeWriteToStdout(chunk);
    this.actionsParser.appendToBuffer(chunk);
    this.responseBuffer += chunk;

    const isMessageComplete = this.actionsParser.isCompleteMessage(
      this.actionsParser.buffer,
    );

    if (!this.actionsParser.isComplete && isMessageComplete) {
      this.actionsParser.isComplete = true;
      this.isStreamComplete = true;
      this.safeWriteToStdout("\n");
    }

    if (this.isStreamComplete && !this.actionsParser.isProcessing) {
      this.actionsParser.isProcessing = true;

      try {
        const actionResult = await this.actionsParser.parseAndExecuteActions(
          this.actionsParser.buffer,
          model,
          async (message) => {
            let actionResponse = "";
            await streamCallback(message, (chunk: string, error?: LLMError) => {
              if (error) {
                this.displayError(error);
                return;
              }
              this.safeWriteToStdout(chunk);
              actionResponse += chunk;
              this.lastActivityTimestamp = Date.now();
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
        this.lastActivityTimestamp = Date.now();

        // Refresh terminal state for new input

        this.safeWriteToStdout("\n");
        this.safeWriteToStdout("\x1B[?25h");
        this.safeClearLine();
        this.safeCursorTo(0);
        this.safeWriteToStdout("> ");

        return actionResult.actions;
      } catch (error) {
        if (error instanceof LLMError) {
          this.displayError(error);
        } else {
          this.displayError(
            new LLMError(
              error.message || "Unknown error during action execution",
              "ACTION_ERROR",
              { originalError: error },
            ),
          );
        }
        this.reset();
        throw error;
      }
    }

    return [];
  }
}
