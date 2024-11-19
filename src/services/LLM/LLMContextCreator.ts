import { autoInjectable } from "tsyringe";
import { DirectoryScanner } from "../FileManagement/DirectoryScanner";
import { ActionExecutor } from "./actions/ActionExecutor";
import { IActionResult } from "./actions/types/ActionTypes";
import { ProjectInfo } from "./utils/ProjectInfo";

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

<instructions detail="brief">
To achieve this goal, I'll:
  - Step 1: Brief explanation.
  - Step 2: Brief explanation.
  - Step 3: Brief explanation.
  - etc.
</instructions>

<important_notes detail="hidden">
  <critical_instructions>
    - Output raw text only. **MOST IMPORTANT RULE!**. DO NOT OUTPUT ENCODED CHARACTERS.
    - Make sure all action tags are properly <tag>formatted</tag>.
    - Place code or markdown inside <write_file> tags.
    - Be concise; avoid verbosity.
    - Dont repeat successful tasks; proceed once done.
    - Maintain correct tag structure.
    - Focus on the task; end with a single <end_task> immediately upon completion.
    - Initial message: brief intro and step-by-step; can read up to 3 files.
    - Use only one <write_file> per output; verify before next step.
    - Dont output markdown/code outside action tags initially.
    - After reading a file, move to the next action without comments.
    - Include content directly within action tags without previews.
    - Dont describe actions; use action tags only.
    - Avoid redundant or unnecessary explanations. Be actionable.
    - Ensure outputs meet requirements and are directly usable.
    - When using <write_file>, ensure the correct PATH.
    
    <code_writing_instructions>
      <before_starting>
        - Read relevant files for context.
        - Check project patterns; for tests, read up to 2 existing tests.
        - Use <read_file> with multiple paths if needed.
        - Follow project patterns.
        - If an external dependency is needed and unavailable, ask for confirmation.
        - Avoid extra dependencies; reuse existing ones.
      </before_starting>

      <during_coding>
        - Use raw text only; no encoded characters.
        - Output full code, not partial.
        - Minimal code removal; focus on the goal.
        - Iterate; dont do everything at once.
        - Ensure correct characters; no encodings.
        - Follow DRY, SRP, KISS, YAGNI, LoD, Immutability principles.
        - Prefer composition over inheritance.
        - Aim for high cohesion and low coupling.
        - Use meaningful names for variables, functions, classes, etc.
        - Comment on why, not what.
        - Adhere to Clean Code principles.
        - Make few changes to prevent bugs.
        - If unsure, check docs or use <end_task> to ask.
        - Ensure correct path imports.
        - Follow project file naming conventions.
        - Provide full implementations; no empty comments.
      </during_coding>

      <after_coding>
        - After changes, if applicable:
          - Run relevant tests; for risky changes, run folder tests.
          - Run type checks and all tests at the end.
          - If tests pass, use <end_task> alone.
          - If tests fail, use <end_task> to report issues and seek guidance.
      </after_coding>
 
      <tests>
        - No tests for logging messages.
        - When fixing tests, run them first before reading files.
        - When adding tests, read target and related files.
        - Ensure added tests pass.
      </tests>
    </code_writing_instructions>
  
    <commands_writing_instructions>
      - Use the project's package manager.
      - Combine commands when possible for efficiency.
    </commands_writing_instructions>
  
    <other_instructions>
      - Summarize high-level progress or completion with <end_task>; exclude action details.
      - If unsure about paths/formats, use placeholders and ask.
      - If stuck, try alternatives or ask for clarification; avoid irrelevant or verbose output.
    </other_instructions>
  
    <docs_writing_instructions>
      - Do not add extra tabs at line starts.
      - Ensure valid markdown; no extra tabs.
      - Use mermaid diagrams with clear explanations when applicable.
      - In mermaid, use [ ] instead of ( ) for diagrams.
      - After <write_file>, use <read_file> to verify changes, then stop.
    </docs_writing_instructions>
  
    <useful_commands>
      Run all tests: yarn test
      Run a specific test: yarn test path/to/test
      Run type check: yarn type-check
    </useful_commands>
  </critical_instructions>
</important_notes>

<available_actions detail="allowed">
    <!-- CRITICAL: MUST FOLLOW CORRECT TAG STRUCTURE PATTERN BELOW -->
    <!-- Don't output // comments -->

    <read_file>
      <path>path/here</path>
      <!-- Critical: Make sure <read_file> tag format is correct! -->
      <!-- Read up to 4 files -->
      <!-- Multiple <path> tags allowed -->
      <!-- Use relative paths -->
    </read_file>

    <write_file>
      <path>/path/here</path>
      <content>
        <!-- Use raw text only -->
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
    <!-- Prompt before removing files or using sudo -->
    <!-- Any command like "ls -la" or "yarn install" -->
    <!-- Don’t install extra dependencies unless allowed -->
    <!-- Use the project's package manager -->
    <!-- Use raw text only -->
    </execute_command>
    
    <search_string>
      <directory>/path/to/search</directory>
      <term>pattern to search</term>
    </search_string>

    <search_file>
      <directory>/path/to/search</directory>
      <term>filename pattern</term>
    </search_file>
    
    <fetch_url>
      <url>https://url/should/be/here</url>
    </fetch_url>

    <end_task>
      <!-- Use read_file to confirm changes before ending -->
      <!-- Ensure all tests and type checks pass or report issues -->
      <message>Summarize and finalize.</message>
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

  async executeAction(actionContent: string): Promise<IActionResult> {
    return this.actionExecutor.executeAction(actionContent);
  }
}
