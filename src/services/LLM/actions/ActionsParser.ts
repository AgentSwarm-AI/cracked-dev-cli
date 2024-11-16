import path from "path";
import { autoInjectable } from "tsyringe";
import { DebugLogger } from "../../DebugLogger";
import { TaskManager } from "../../TaskManager/TaskManager";
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
    private taskManager: TaskManager,
  ) {}

  reset() {
    this.processedTags.clear();
    this.currentMessageBuffer = "";
    this.isProcessingAction = false;
    this.messageComplete = false;
    this.taskManager.reset();
  }

  isCompleteMessage(text: string): boolean {
    const sections = [
      "<strategy>",
      "</strategy>",
      "<next_step>",
      "</next_step>",
    ];

    let lastIndex = -1;
    for (const section of sections) {
      const index = text.indexOf(section);
      if (index === -1 || index < lastIndex) {
        return false;
      }
      lastIndex = index;
    }

    return true;
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
      // Parse strategy if present in initial message
      if (text.includes("<strategy>")) {
        this.taskManager.parseStrategy(text);
        const goals = this.taskManager.getAllGoals();
        this.debugLogger.log("Strategy", "Parsed strategy and goals", {
          goals,
        });
      }

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

      // Include current goal in followup message if available
      const currentGoal = this.taskManager.getCurrentGoal();
      const goalStatus = currentGoal
        ? `Current Goal: ${currentGoal.description}\n\n`
        : "";

      const followupMessage = `${goalStatus}${actionResults}`;

      this.debugLogger.log("Action Results", "Sending action results to LLM", {
        message: followupMessage,
      });

      const followupResponse = await llmCallback(followupMessage);

      console.log("\n🤖:", followupResponse);

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
