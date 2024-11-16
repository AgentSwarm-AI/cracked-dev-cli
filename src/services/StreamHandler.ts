import { autoInjectable } from "tsyringe";
import { ActionsParser } from "./ActionsParser";
import { DebugLogger } from "./DebugLogger";

export interface StreamCallback {
  (message: string): Promise<string>;
}

@autoInjectable()
export class StreamHandler {
  private responseBuffer: string = "";

  constructor(
    private debugLogger: DebugLogger,
    private actionsParser: ActionsParser,
  ) {}

  reset() {
    this.responseBuffer = "";
  }

  get response() {
    return this.responseBuffer;
  }

  async handleChunk(
    chunk: string,
    model: string,
    llmCallback: StreamCallback,
    options?: Record<string, unknown>,
  ) {
    process.stdout.write(chunk);

    this.actionsParser.appendToBuffer(chunk);
    this.responseBuffer += chunk;

    if (
      !this.actionsParser.isComplete &&
      this.actionsParser.isCompleteMessage(this.actionsParser.buffer)
    ) {
      this.actionsParser.isComplete = true;
      this.debugLogger.log("Status", "Complete message detected", null);
    }

    if (this.actionsParser.isComplete && !this.actionsParser.isProcessing) {
      this.actionsParser.isProcessing = true;
      this.debugLogger.log("Action", "Processing actions", null);

      await this.actionsParser.parseAndExecuteActions(
        this.actionsParser.buffer,
        model,
        async (message) => {
          const response = await llmCallback(message);
          process.stdout.write(response);
          this.responseBuffer += response;
          return response;
        },
      );

      this.actionsParser.clearBuffer();
      this.actionsParser.isProcessing = false;
    }
  }
}
