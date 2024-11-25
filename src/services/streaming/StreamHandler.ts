import { ActionsParser } from "@services/LLM/actions/ActionsParser";

import { DebugLogger } from "@services/logging/DebugLogger";
import { autoInjectable } from "tsyringe";
import { WriteStream } from "tty";
import { LLMError } from "../LLMProviders/OpenRouter/OpenRouterAPI";

const MAX_BUFFER_SIZE = 10 * 1024 * 1024; // 10MB default max buffer size
const CHUNK_SIZE = 1024 * 1024; // 1MB chunk size for processing
const STREAM_TIMEOUT = 10000; // 10 seconds timeout for inactivity

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

@autoInjectable()
export class StreamHandler {
  private responseBuffer: string = "";
  private isStreamComplete: boolean = false;
  private lastActivityTimestamp: number = Date.now();
  private bufferSize: number = 0;
  private inactivityTimer: NodeJS.Timeout | null = null;

  constructor(
    private debugLogger: DebugLogger,
    private actionsParser: ActionsParser,
  ) {}

  reset() {
    this.responseBuffer = "";
    this.isStreamComplete = false;
    this.lastActivityTimestamp = Date.now();
    this.bufferSize = 0;
    this.actionsParser.reset();
    this.clearInactivityTimer();
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
          details: `API rate limit reached.${
            error.details?.retryAfter
              ? ` Try again in ${error.details.retryAfter} seconds.`
              : ""
          }`,
          suggestion: "Please wait before making another request.",
        };
      case "MODEL_ERROR":
        return {
          title: "Model Error",
          details: `Error with model${
            error.details?.modelId ? ` ${error.details.modelId}` : ""
          }: ${error.message}`,
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
      case "BUFFER_OVERFLOW":
        return {
          title: "Buffer Overflow",
          details: "The stream buffer has exceeded its maximum size limit.",
          suggestion:
            "Try processing the stream in smaller chunks or increase the buffer size limit.",
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
    this.safeWriteToStdout("\x1b[31m"); // Red color
    this.safeWriteToStdout(`❌ ${title}\n`);
    this.safeWriteToStdout("\x1b[0m"); // Reset color

    this.safeWriteToStdout("\x1b[37m"); // Light gray color
    this.safeWriteToStdout(`${details}\n`);

    if (suggestion) {
      this.safeWriteToStdout("\n");
      this.safeWriteToStdout("\x1b[36m"); // Cyan color
      this.safeWriteToStdout(`💡 ${suggestion}\n`);
    }

    this.safeWriteToStdout("\x1b[0m"); // Reset color
    this.safeWriteToStdout("\n");

    // Log error to debug logger
    this.debugLogger.log("Error", details, { title, suggestion });
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

  private processChunk(chunk: string): string[] {
    if (!chunk) return [""];

    const chunks: string[] = [];
    let remainingChunk = chunk;

    while (remainingChunk.length > 0) {
      const chunkToProcess = remainingChunk.slice(0, CHUNK_SIZE);
      chunks.push(chunkToProcess);
      remainingChunk = remainingChunk.slice(CHUNK_SIZE);
    }

    return chunks;
  }

  private handleBufferOverflow() {
    // Keep the last 1MB of data when overflow occurs
    const keepSize = 1024 * 1024;
    this.responseBuffer = this.responseBuffer.slice(-keepSize);
    this.bufferSize = this.responseBuffer.length;
    this.actionsParser.clearBuffer();
    this.actionsParser.appendToBuffer(this.responseBuffer);

    this.debugLogger.log("Buffer Overflow", "Buffer size limit exceeded", {
      maxSize: MAX_BUFFER_SIZE,
      currentSize: this.bufferSize,
    });
  }

  private startInactivityTimer() {
    this.clearInactivityTimer();
    this.inactivityTimer = setTimeout(() => {
      this.displayError(
        new LLMError(
          "The stream was inactive for too long.",
          "STREAM_TIMEOUT",
          { timeout: STREAM_TIMEOUT },
        ),
      );
      this.reset();
    }, STREAM_TIMEOUT);
  }

  private clearInactivityTimer() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
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
    this.startInactivityTimer();

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

    const chunks = this.processChunk(chunk);

    for (const subChunk of chunks) {
      if (this.bufferSize + subChunk.length > MAX_BUFFER_SIZE) {
        this.handleBufferOverflow();
        this.displayError(
          new LLMError("Buffer size limit exceeded", "BUFFER_OVERFLOW", {
            maxSize: MAX_BUFFER_SIZE,
            currentSize: this.bufferSize,
          }),
        );
      }

      this.safeWriteToStdout(subChunk);
      this.actionsParser.appendToBuffer(subChunk);
      this.responseBuffer += subChunk;
      this.bufferSize += subChunk.length;
    }

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

            if (this.bufferSize + actionResponse.length > MAX_BUFFER_SIZE) {
              this.handleBufferOverflow();
              this.displayError(
                new LLMError(
                  "Buffer size limit exceeded after action",
                  "BUFFER_OVERFLOW",
                  { maxSize: MAX_BUFFER_SIZE, currentSize: this.bufferSize },
                ),
              );
            }

            this.responseBuffer += actionResponse;
            this.bufferSize += actionResponse.length;
            return actionResponse;
          },
        );

        // Properly reset state after action execution
        this.actionsParser.reset();
        this.isStreamComplete = false;
        this.bufferSize = 0;

        // Refresh terminal state for new input
        this.safeWriteToStdout("\n");
        this.safeWriteToStdout("\x1B[?25h"); // Show cursor
        this.safeClearLine();
        this.safeCursorTo(0);
        this.safeWriteToStdout("> ");

        this.clearInactivityTimer();

        return actionResult.actions;
      } catch (error) {
        this.debugLogger.log("Error", "Error processing actions", { error });
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
        return [];
      }
    }

    return [];
  }
}
