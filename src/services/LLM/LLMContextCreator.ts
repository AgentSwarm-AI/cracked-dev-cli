import { autoInjectable } from "tsyringe";
import { DirectoryScanner } from "../FileManagement/DirectoryScanner";
import { ProjectInfo } from "../ProjectInfo/ProjectInfo";
import { ActionExecutor } from "./actions/ActionExecutor";

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

<environment>
${context.environmentDetails}

${context.projectInfo}
</environment>

You MUST answer following this pattern:

To achieve this XYZ goal, I need to perform the following steps:
  - your first step here
  - second step here
  - etc.

<!-- next step should be aimed towards one of the steps above -->

I'll perform <action_name> to achieve the desired goal.


FURTHER INSTRUCTIONS


## Important notes

DO NOT WASTE TOKENS. Avoid unnecessary code outputs that are not related with <write_file> or <execute_command> actions. For example, "here's how I'd fix it". This is not necessary. Just use tokens to actually perform the task.

## Verification tips

- Once you've finished the task, make sure to run a test command (check on package.json if you're not sure).


## If you get stuck in a loop of errors

Try different approaches, take a step back, inspect other files. If you're still stuck, ask for help from the user or stop.

## Available Actions

Available action_names are:
- read_file: Read contents of a file
  <read_file>
    <path>/path/here</path>
  </read_file>

- write_file: Write content to a file
  <write_file>
    <path>/path/here</path>
    <content>
    // Your file content here
    </content>
  </write_file>

- delete_file: Delete a file
  <delete_file>
    <path>/path/here</path>
  </delete_file>

- move_file: Move/rename a file
  <move_file>
    <source_path>source/path/here</source_path>
    <destination_path>destination/path/here</destination_path>
  </move_file>

- copy_file_slice: Copy a file
  <copy_file_slice>
    <source_path>source/path/here</source_path>
    <destination_path>destination/path/here</destination_path>
  </copy_file_slice>

- execute_command: Execute a CLI command
  <execute_command>
    npm install package-name
  </execute_command>

- search_string/search_file: Search in files
  <search_string>
    <directory>/path/to/search</directory>
    <term>pattern to search</term>
  </search_string>

  <search_file>
    <directory>/path/to/search</directory>
    <term>filename pattern</term>
  </search_file>
`;
  }

  private formatSequentialMessage(context: MessageContext): string {
    return context.message;
  }

  async parseAndExecuteActions(
    response: string,
  ): Promise<Array<{ action: string; result: any }>> {
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
