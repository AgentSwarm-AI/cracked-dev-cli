import { autoInjectable } from "tsyringe";
import { ActionExecutor } from "../ActionExecutor/ActionExecutor";
import { DirectoryScanner } from "../FileManagement/DirectoryScanner";

export interface ILLMContext {
  task: string;
  environmentDetails: string;
  isFirstMessage: boolean;
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
    const scanResult = await this.directoryScanner.scan(root);
    if (!scanResult.success) {
      throw new Error(`Failed to scan directory: ${scanResult.error}`);
    }

    const context: ILLMContext = {
      task: message,
      environmentDetails: `# Current Working Directory (${root}) Files\n${scanResult.data}`,
      isFirstMessage,
    };

    return this.format(context);
  }

  async parseAndExecuteActions(
    response: string,
  ): Promise<Array<{ action: string; result: any }>> {
    const results = [];
    const actionRegex =
      /<(read_file|write_file|delete_file|update_file|move_file|copy_file_slice|execute_command|search_string|search_file|edit_code_file)>([\s\S]*?)<\/\1>/g;

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

  private format(context: ILLMContext): string {
    const baseFormat = `<task>
  ${context.task}
</task>

<environment>
  ${context.environmentDetails}
</environment>

<instructions>
  Your response must adhere to the following structured format:
${
  context.isFirstMessage
    ? `
  <strategy>
    <goal>This is the first step</goal>
    <goal>This is the second step</goal>
    <!-- Add more steps as needed -->
  </strategy>
`
    : ""
}
  If you don't think the task objective was achieved, decide what to do next:

  <next_step>
    I will perform a <read_file>path/to/file</read_file> operation.
  </next_step>

  Else, submit the final response:

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
  
  <!-- Code Editing -->
  <edit_code_file>
    <file_path>src/LLMContextCreator.ts</file_path>
    <range>10-15</range>
    <replace_with>
      // New code here
      console.log("Hello, world!");
    </replace_with>
    ###
    <file_path>src/LLMContextCreator.ts</file_path>
    <range>20-25</range>
    <replace_with>
      // Another new code here
      console.log("Goodbye, world!");
    </replace_with>
  </edit_code_file>
</available_tags>
`;

    return baseFormat;
  }
}
