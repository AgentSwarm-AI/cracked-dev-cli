import { autoInjectable } from "tsyringe";
import { DebugLogger } from "./DebugLogger";
import { LLMContextCreator } from "./LLM/LLMContextCreator";

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

  findCompleteTags(text: string): string[] {
    const completeTags: string[] = [];
    const regex =
      /<(read_file|write_file|delete_file|update_file|move_file|copy_file_slice|execute_command|search_string|search_file|edit_code_file)>[\s\S]*?<\/\1>/g;
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

  async parseAndExecuteActions(
    text: string,
    model: string,
    llmCallback: (message: string) => Promise<string>,
  ) {
    const completeTags = this.findCompleteTags(text);
    if (completeTags.length === 0) return [];

    this.debugLogger.log("Tags", "Found complete action tags", {
      tags: completeTags,
    });

    const actions = await this.contextCreator.parseAndExecuteActions(text);
    if (actions.length === 0) return [];

    const actionResults = actions
      .map(
        ({ action, result }) =>
          `[Action Result] ${action}: ${JSON.stringify(result)}`,
      )
      .join("\n");

    const followupMessage = `Previous actions have been executed with the following results:\n${actionResults}\nPlease continue with the task.`;

    this.debugLogger.log("Action Results", "Sending action results to LLM", {
      message: followupMessage,
    });

    const followupResponse = await llmCallback(followupMessage);

    this.debugLogger.log(
      "Response",
      "Received LLM response for action results",
      {
        response: followupResponse,
      },
    );

    return actions;
  }
}
