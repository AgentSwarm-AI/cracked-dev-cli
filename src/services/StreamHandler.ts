import { autoInjectable } from "tsyringe";
import { ActionsParser } from "./ActionsParser";
import { DebugLogger } from "./DebugLogger";

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
  }

  get response() {
    return this.responseBuffer;
  }

  private checkTaskCompletion(response: string): string | null {
    const completionMatch = response.match(
      /<task_objective_completed>\s*([\s\S]*?)\s*<\/task_objective_completed>/,
    );
    if (completionMatch) {
      const completionContent = completionMatch[1].trim();
      return `
🎯 Task Objective Completed! 🎉

${completionContent}

✨ Session ended successfully. ✨

-------------------
🔚 Interaction Complete
`;
    }
    return null;
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
    process.stdout.write(chunk);

    this.actionsParser.appendToBuffer(chunk);
    this.responseBuffer += chunk;

    // Check for task completion in the current chunk
    const completionMessage = this.checkTaskCompletion(chunk);
    if (completionMessage) {
      process.stdout.write("\n" + completionMessage + "\n");
      this.responseBuffer = completionMessage;
      return [];
    }

    // Check if the message is complete
    if (
      !this.actionsParser.isComplete &&
      this.actionsParser.isCompleteMessage(this.actionsParser.buffer)
    ) {
      this.actionsParser.isComplete = true;
      this.isStreamComplete = true;
      this.debugLogger.log("Status", "Complete message detected", null);
      process.stdout.write("\n");
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
            process.stdout.write(chunk);
            actionResponse += chunk;
          });

          // Check for task completion in the action response
          const actionCompletionMessage =
            this.checkTaskCompletion(actionResponse);
          if (actionCompletionMessage) {
            this.responseBuffer = actionCompletionMessage;
            process.stdout.write("\n" + actionCompletionMessage + "\n");
            return actionResponse;
          }

          this.responseBuffer += actionResponse;
          return actionResponse;
        },
      );

      this.actionsParser.clearBuffer();
      this.actionsParser.isProcessing = false;

      // Reset stream completion state after processing actions
      this.isStreamComplete = false;

      // Refresh terminal state for new input
      process.stdout.write("\n");
      process.stdout.write("\x1B[?25h"); // Show cursor
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write("> "); // Write prompt character immediately

      return actionResult.actions;
    }

    return [];
  }
}
