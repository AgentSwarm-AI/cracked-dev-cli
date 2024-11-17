import { autoInjectable } from "tsyringe";
import { DirectoryScanner } from "../FileManagement/DirectoryScanner";
import { ProjectInfo } from "../ProjectInfo/ProjectInfo";
import { ActionExecutor } from "./actions/ActionExecutor";
import { IActionResult } from "./actions/types/ActionTypes";

interface MessageContext {
  message: string;
  environmentDetails?: string;
  projectInfo?: string;
}

@autoInjectable()
export class LLMContextCreator {
  constructor(
    private directoryScanner: DirectoryScanner,
    private actionExecutor: ActionExecutor,
    private projectInfo: ProjectInfo,
  ) {}

  async create(
    message: string,
    root: string,
    isFirstMessage: boolean = true,
  ): Promise<string> {
    const baseContext: MessageContext = {
      message,
    };

    if (isFirstMessage) {
      const [environmentDetails, projectInfo] = await Promise.all([
        this.getEnvironmentDetails(root),
        this.getProjectInfo(root),
      ]);

      return this.formatFirstTimeMessage({
        ...baseContext,
        environmentDetails,
        projectInfo,
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

  private async getProjectInfo(root: string): Promise<string> {
    const info = await this.projectInfo.gatherProjectInfo(root);
    if (!info.dependencyFile) {
      return "";
    }

    return `# Project Dependencies (from ${info.dependencyFile})
Main Dependencies: ${info.mainDependencies.join(", ")}

# Available Scripts
${Object.entries(info.scripts)
  .map(([name, command]) => `${name}: ${command}`)
  .join("\n")}`;
  }

  private formatFirstTimeMessage(context: MessageContext): string {
    return `<task>
${context.message}
</task>


<instructions>
To achieve the XYZ goal, follow these steps:
  - Step 1
  - Step 2
  - Step 3
</instructions>

<important_notes detail="hidden_on_output">
    <critical_instructions>
      ALWAYS output code or markdown changes directly using <write_file> tag. 
      Avoid wasting tokens with redundancy.
      Ensure actions align with the next step. If done, use <end_task>.
      Test coding tasks ONLY;
      </critical_instructions>

    <other_instructions>
    Try alternatives if stuck, inspect other files, ask for help, or stop with <end_task>.
    Avoid excessive changes at once to prevent bugs. 
    </other_instructions>


</important_notes>

<available_actions detail="allowed_on_output">
## Available Actions

Available action_tags are:

read_file: Read contents of a file

  <read_file>
    <path>/path/here</path>
  </read_file>

write_file: Write content to a file
  <write_file>
    <path>/path/here</path>
    <content>
    // Your file content here
    </content>
  </write_file>

delete_file: Delete a file
  <delete_file>
    <path>/path/here</path>
  </delete_file>

move_file: Move/rename a file
  <move_file>
    <source_path>source/path/here</source_path>
    <destination_path>destination/path/here</destination_path>
  </move_file>

copy_file_slice: Copy a file
  <copy_file_slice>
    <source_path>source/path/here</source_path>
    <destination_path>destination/path/here</destination_path>
  </copy_file_slice>

execute_command: Execute a CLI command
  <execute_command>
    npm install package-name
  </execute_command>

search_string/search_file: Search in files
  <search_string>
    <directory>/path/to/search</directory>
    <term>pattern to search</term>
  </search_string>

  <search_file>
    <directory>/path/to/search</directory>
    <term>filename pattern</term>
  </search_file>

  <end_task>
    <message>Summarize what was done and finalize.</message>
  </end_task>
</available_actions>


<environment>
${context.environmentDetails}
${context.projectInfo}
</environment>
`;
  }

  private formatSequentialMessage(context: MessageContext): string {
    return context.message;
  }

  async parseAndExecuteActions(
    response: string,
  ): Promise<Array<{ action: string; result: IActionResult }>> {
    console.log("-".repeat(50));

    console.log("\n\n🔍 LLMContextCreator: Parsing and executing actions...\n");

    const results = [];
    const actionRegex =
      /<(read_file|write_file|delete_file|update_file|move_file|copy_file_slice|execute_command|search_string|search_file)>(?:[^<]*|<(?!\/\1>)[^<]*)*<\/\1>/g;

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
