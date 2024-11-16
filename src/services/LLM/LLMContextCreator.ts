import { autoInjectable } from "tsyringe";
import { DirectoryScanner } from "../FileManagement/DirectoryScanner";
import { TaskStage } from "../TaskManager/TaskStage";
import { ActionExecutor } from "./actions/ActionExecutor";

interface MessageContext {
  message: string;
  environmentDetails?: string;
}

interface FirstTimeMessageContext extends MessageContext {
  stage: TaskStage;
  stagePrompt: string;
}

interface SequentialMessageContext extends MessageContext {
  previousContext?: string;
}

@autoInjectable()
export class LLMContextCreator {
  constructor(
    private directoryScanner: DirectoryScanner,
    private actionExecutor: ActionExecutor,
  ) {}

  async create(
    message: string,
    root: string,
    isFirstMessage: boolean = true,
    stage: TaskStage = TaskStage.DISCOVERY,
    stagePrompt: string = "",
  ): Promise<string> {
    const baseContext: MessageContext = {
      message,
    };

    if (isFirstMessage) {
      const environmentDetails = await this.getEnvironmentDetails(root);
      return this.formatFirstTimeMessage({
        ...baseContext,
        environmentDetails,
        stage,
        stagePrompt,
      });
    }

    return this.formatSequentialMessage({
      ...baseContext,
      stage,
    });
  }

  private async getEnvironmentDetails(root: string): Promise<string> {
    const scanResult = await this.directoryScanner.scan(root);
    if (!scanResult.success) {
      throw new Error(`Failed to scan directory: ${scanResult.error}`);
    }
    return `# Current Working Directory (${root}) Files\n${scanResult.data}`;
  }

  private formatFirstTimeMessage(context: FirstTimeMessageContext): string {
    return context.message;
  }

  private formatSequentialMessage(
    context: SequentialMessageContext & { stage?: TaskStage },
  ): string {
    return context.message;
  }

  async parseAndExecuteActions(
    response: string,
  ): Promise<Array<{ action: string; result: any }>> {
    const results = [];
    const actionRegex =
      /<(read_file|write_file|delete_file|update_file|move_file|copy_file_slice|execute_command|search_string|search_file)>([\s\S]*?)<\/\1>/g;

    let match;
    while ((match = actionRegex.exec(response)) !== null) {
      const [fullMatch] = match;
      const result = await this.actionExecutor.executeAction(fullMatch);
      results.push({
        action: fullMatch,
        result,
      });
    }

    return results;
  }
}
