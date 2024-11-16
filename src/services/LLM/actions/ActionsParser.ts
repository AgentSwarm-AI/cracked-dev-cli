import path from "path";
import { autoInjectable } from "tsyringe";
import { DebugLogger } from "../../DebugLogger";
import { LLMContextCreator } from "../LLMContextCreator";

export interface ActionExecutionResult {
  actions: Array<{ action: string; result: any }>;
  followupResponse?: string;
}

@autoInjectable()
export class ActionsParser {
  private processedTags: Set<string> = new Set();
  private currentMessageBuffer: string = "";
  private isProcessingAction: boolean = false;
  private messageComplete: boolean = false;

  constructor(
    private debugLogger: DebugLogger,
    private contextCreator: LLMContextCreator,
  ) {}

  reset() {
    this.processedTags.clear();
    this.currentMessageBuffer = "";
    this.isProcessingAction = false;
    this.messageComplete = false;
  }

  isCompleteMessage(text: string): boolean {
    return true; // Always consider messages complete for now
  }

  extractFilePath(tag: string): string | null {
    const fileActions = [
      "read_file",
      "write_file",
      "delete_file",
      "move_file",
      "copy_file_slice",
    ];
    const actionMatch = new RegExp(`<(${fileActions.join("|")})>`).exec(tag);
    if (!actionMatch) return null;

    const pathMatch = /<path>(.*?)<\/path>/;
    const match = tag.match(pathMatch);
    if (!match) return null;

    // Resolve the path relative to the current working directory
    return path.resolve(process.cwd(), match[1]);
  }

  findCompleteTags(text: string): string[] {
    const completeTags: string[] = [];
    // Updated regex to properly handle nested tags
    const regex =
      /<(read_file|write_file|delete_file|move_file|copy_file_slice|execute_command|search_string|search_file)>(?:[^<]*|<(?!\/\1>)[^<]*)*<\/\1>/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const fullTag = match[0];
      if (!this.processedTags.has(fullTag)) {
        completeTags.push(fullTag);
        this.processedTags.add(fullTag);
      }
    }

    return completeTags;
  }

  appendToBuffer(chunk: string) {
    this.currentMessageBuffer += chunk;
  }

  clearBuffer() {
    this.currentMessageBuffer = "";
    this.processedTags.clear(); // Clear processed tags when clearing buffer
  }

  get buffer() {
    return this.currentMessageBuffer;
  }

  get isProcessing() {
    return this.isProcessingAction;
  }

  set isProcessing(value: boolean) {
    this.isProcessingAction = value;
  }

  get isComplete() {
    return this.messageComplete;
  }

  set isComplete(value: boolean) {
    this.messageComplete = value;
  }

  private formatActionResult(action: string, result: any): string {
    const actionMatch = /<(\w+)>([\s\S]*?)<\/\1>/.exec(action);
    if (!actionMatch) return `[Action Result] Invalid action format`;

    const [_, actionType] = actionMatch;

    if (actionType === "read_file" && result.success) {
      return `Here's the content of the requested file:\n\n${result.data}\n\nPlease analyze this content and continue with the task.`;
    }

    return `[Action Result] ${actionType}: ${result.success ? "Success" : `Failed - ${result.error}`}`;
  }

  async parseAndExecuteActions(
    text: string,
    model: string,
    llmCallback: (message: string) => Promise<string>,
  ): Promise<ActionExecutionResult> {
    try {
      const completeTags = this.findCompleteTags(text);
      this.debugLogger.log("Tags", "Found complete action tags", {
        tags: completeTags,
      });

      if (completeTags.length === 0) {
        this.debugLogger.log("Actions", "No action tags found in text");
        return { actions: [] };
      }

      // Extract and log file paths
      completeTags.forEach((tag) => {
        const filePath = this.extractFilePath(tag);
        if (filePath) {
          this.debugLogger.log("FilePath", "Found file path in action", {
            path: filePath,
          });
        }
      });

      const actions = await this.contextCreator.parseAndExecuteActions(text);

      if (!actions || actions.length === 0) {
        this.debugLogger.log("Actions", "No actions executed");
        return { actions: [] };
      }

      const actionResults = actions
        .map(({ action, result }) => this.formatActionResult(action, result))
        .join("\n\n");

      const followupResponse = await llmCallback(actionResults);

      this.debugLogger.log(
        "Response",
        "Received LLM response for action results",
        {
          response: followupResponse,
        },
      );

      return { actions, followupResponse };
    } catch (error) {
      console.error("Error in parseAndExecuteActions:", error);
      this.debugLogger.log("Error", "Failed to parse and execute actions", {
        error,
      });
      return { actions: [] };
    }
  }
}
