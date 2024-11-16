import { autoInjectable } from "tsyringe";
import { ActionExecutor } from "../ActionExecutor/ActionExecutor";
import { DirectoryScanner } from "../FileManagement/DirectoryScanner";

interface MessageContext {
  task: string;
  environmentDetails: string;
}

interface FirstTimeMessageContext extends MessageContext {
  strategySection: string;
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
  ): Promise<string> {
    const environmentDetails = await this.getEnvironmentDetails(root);

    const baseContext: MessageContext = {
      task: message,
      environmentDetails,
    };

    if (isFirstMessage) {
      return this.formatFirstTimeMessage({
        ...baseContext,
        strategySection: this.getStrategySection(),
      });
    }

    return this.formatSequentialMessage(baseContext);
  }

  private async getEnvironmentDetails(root: string): Promise<string> {
    const scanResult = await this.directoryScanner.scan(root);
    if (!scanResult.success) {
      throw new Error(`Failed to scan directory: ${scanResult.error}`);
    }
    return `# Current Working Directory (${root}) Files\n${scanResult.data}`;
  }

  private getStrategySection(): string {
    return `
  <strategy>
    <goal>This is the first step</goal>
    <goal>This is the second step</goal>
    <!-- Add more steps as needed -->
  </strategy>`;
  }

  private formatFirstTimeMessage(context: FirstTimeMessageContext): string {
    return this.getFormattedMessage(
      context.task,
      context.environmentDetails,
      context.strategySection,
    );
  }

  private formatSequentialMessage(context: SequentialMessageContext): string {
    return this.getFormattedMessage(context.task, context.environmentDetails);
  }

  private getFormattedMessage(
    task: string,
    environmentDetails: string,
    strategySection: string = "",
  ): string {
    return `<task>
  ${task}
</task>

<environment>
  ${environmentDetails}
</environment>

<instructions>
  Your response must adhere to the following structured format:
${strategySection}
  If you don't think the task objective was achieved, decide what to do next:

  <!-- Next step to achieve current goal -->
  <!-- Feel free to use any available tags below to whats appropriate to achieve your goal -->
  <!-- Remember that most of the time you'll need to read_file first to get the data you need -->
  <next_step>
    To achieve xyz goal, I will perform a <read_file>path/to/file</read_file> operation.
  </next_step>

  Else, submit the final response:

   <!-- Before declaring an objective as complete, make sure all objectives were done. You generally need to read_file first to get the data you need to confirm -->
    <task_objective_completed>
      Some final response here summarizing what was done briefly and why did it achieved the task objective.
    </task_objective_completed>
  
</instructions>

<available_tags>
  <!-- File Operations -->
  <read_file>path/to/file</read_file>
  <write_file>path/to/file</write_file>
  <delete_file>path/to/file</delete_file>
  <update_file>path/to/file</update_file>
  <move_file>path/to/file</move_file>
  <copy_file_slice>path/to/file</copy_file_slice>
  
  <!-- Command Execution -->
  <execute_command>command_here</execute_command>
  
  <!-- Search Operations -->
  <search_string>string_to_search</search_string>
  <search_file>path/to/file</search_file>
  
 
</available_tags>`;
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
