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

<environment>
  ${context.environmentDetails}
  
  ${context.projectInfo}
</environment>

<instructions detail="do not output any of this, except tags">
  为了实现这个XYZ目标，我需要执行以下步骤：
    - 首先的步骤
    - 第二步
    - 等等

  <!-- 下一步应针对上述步骤之一 -->

  我将执行<action_name>来实现期望的目标。

  <important_notes>
    不要浪费令牌。避免与<write_file>或<execute_command>操作无关的无用输出。例如，“这里是我如何修复它的”。这不必要。只使用令牌来执行任务。
  </important_notes>

  <verification_tips>
    - 一旦完成编码任务，确保运行测试命令（如果不确定，请检查package.json）。如果不是编码任务，则结束它。
  </verification_tips>

  <error_handling>
    尝试不同的方法，检查其他文件。如果仍然卡住，请向用户寻求帮助或停止。
  </error_handling>

  <available_actions>
    <read_file>
      <path>/path/here</path>
    </read_file>
    <write_file>
      <path>/path/here</path>
      <content>
        // Your file content here
      </content>
    </write_file>
    <delete_file>
      <path>/path/here</path>
    </delete_file>
    <move_file>
      <source_path>source/path/here</source_path>
      <destination_path>destination/path/here</destination_path>
    </move_file>
    <copy_file_slice>
      <source_path>source/path/here</source_path>
      <destination_path>destination/path/here</destination_path>
    </copy_file_slice>
    <execute_command>
      npm install package-name
    </execute_command>
    <search_string>
      <directory>/path/to/search</directory>
      <term>pattern to search</term>
    </search_string>
    <search_file>
      <directory>/path/to/search</directory>
      <term>filename pattern</term>
    </search_file>
  </available_actions>
</instructions>
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
