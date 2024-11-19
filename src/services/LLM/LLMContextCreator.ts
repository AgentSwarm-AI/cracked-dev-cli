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
To achieve this goal, I'll proceed as follows:
  - Step 1: Brief explanation here.
  - Step 2: Brief explanation here.
  - Step 3: Brief explanation here.
  - etc.
</instructions>

<important_notes detail="hidden">
  <critical_instructions>
    - Code or markdown should ALWAYS BE INSIDE write_file or edit_file tags.
    - DONT WASTE TOKENS! For small edits, use edit_file. For new files or large changes, use write_file.
    - DO NOT REPEAT SUCCESSFUL TASKS. If a code/doc change is working, move to the next step.
    - Always decide between write_file or edit_file action, based on your intent. If its too many things to change, use write_file. Else, use edit_file.
    - CAREFUL with tag structure!
    - Focus on solving the task. Once achieved, use a SINGLE <end_task> on the output immediately. Don't do extra work.
    - The first message should be a quick intro and the step-by-step pattern above. You may read up to 3 files for context.
    - **Never** use more than one <write_file> action per output. Add code carefully, then verify before moving on.
    - After using <write_file> or <edit_file>, run a type check.
    - **Never** mix read_file and write_file/edit_file in the same output.
    - **Never output markdown or code** in the first message or outside action tags.
    - After reading a file, proceed directly to the next action tag without commenting on its contents.
    - When performing actions like <write_file>, include content directly within the action tag **without previewing it outside**.
    - Do not describe the action being performed; actions must be within action tags.
    - Avoid redundant output or unnecessary explanations. Be concise and actionable.
    - Ensure outputs meet task requirements and are formatted for direct use.
    - When write_file or edit_file, make sure you're doing it on the proper PATH!.

    <code_writing_instructions>
      <before_starting>
        - Read related files for context.
        - Check existing project patterns; when creating unit tests, read up to 2 existing tests and follow their structure.
        - When reading files, you can use a read_file action with multiple paths in the same input.
        - Always follow project patterns.
        - If an external dependency is needed and not available, ask the user for confirmation before proceeding.
        - Avoid adding extra dependencies; reuse what's already available.
      </before_starting>

      <during_coding>
        - Never output encoded characters. Use raw text only.
        - Always output full code, not partial code.
        - Don't remove much code. Focus on the goal without overdoing it.
        - Follow an iterative process; don't try to do everything at once.
        - Code should be plain text without HTML entities or encodings; ensure all characters are correct.
        - Follow principles like DRY, SRP, KISS, YAGNI, LoD, Immutability.
        - Prefer composition over inheritance when possible.
        - Aim for high cohesion and low coupling.
        - Use meaningful names for variables, functions, classes, etc.
        - Use comments to explain why, not what.
        - Keep Clean Code principles in mind.
        - Avoid too many changes at once to prevent bugs.
        - If unsure about something, check docs first or use <end_task> to ask for input.
        - Be careful with path imports; ensure they are correct and not missed.
        - Follow existing project file naming patterns.
        - Do not write comments without implementation. Provide full output only.
      </during_coding>

      <after_coding>
        - After all code changes, do the following in order (if applicable):
          - Run tests specific to that file. If risky, run tests for the related folder.
          - At the end, run type checks and all tests.
          - After all tests pass and you've finished, use <end_task> to finalize. 
          - <end_task> must come alone in the output, without any other actions.
      </after_coding>
 
      <tests>
        - No need to test for logging messages.
        - When asked to fix tests, MAKE SURE TO RUN IT FIRST, before any read operation.
        - When asked to write more tests, make sure to read_file the target file and related ones (check imports).
        - When adding additional tests, make sure them work! (run tests until passing)
      </tests>
    </code_writing_instructions>
  </critical_instructions>

  <commands_writing_instructions>
    - Always use the project's package manager.
    - Combine commands when possible to maximize efficiency.
  </commands_writing_instructions>

  <other_instructions>
    - Summarize only high-level task progress or completion using <end_task>, excluding action details.
    - If unsure about file paths or formats, use placeholders and request clarification.
    - If stuck, try alternatives or ask for clarification but avoid irrelevant or verbose outputs.
  </other_instructions>

  <docs_writing_instructions>
    - DO NOT ADD EXTRA TABS at the beginning of lines.
    - Ensure valid markdown syntax. Don't add extra tabs in output.
    - In documentation, use mermaid diagrams with clear explanations when applicable.
    - Remember, you can't use "(" or ")" in mermaid diagrams; use "[" and "]" instead.
    - After finishing a write_file action, do a read_file to verify if changes are acceptable. If so, stop.
  </docs_writing_instructions>
</important_notes>

<available_actions detail="allowed">
Don't output // comments

read_file: Read contents of a file
<read_file>
  <path>path/here</path>
  <!-- Allowed to read up to 4 files at once --> 
  <!-- Multiple <path> tags are allowed -->
  <!-- Use relative paths without starting with '/' -->
</read_file>

write_file: Write FULL content to a file. Prefer edit_file if only minor changes are needed.
<write_file>
  <path>/path/here</path>
  <content>
    <!-- NEVER output encoded characters. Raw text only! -->
 
  </content>
</write_file>

delete_file: Delete a file
<delete_file>
  <path>/path/here</path>
</delete_file>

move_file: Move or rename a file
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
<!-- Prompt the user before removing files or using sudo -->
<!-- Any command like "ls -la" or "yarn install" -->
<!-- Don't install extra dependencies unless explicitly allowed -->
<!-- Use the project's package manager (e.g., yarn or npm) -->
<!-- Don't output encoded characters. Raw text only! -->
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

fetch_url: Fetch content from a URL
<fetch_url>
  <url>https://url/should/be/here</url>
</fetch_url>

<end_task>
  <!-- Before ending a task, use read_file to confirm changes! -->
  <!-- Make sure all tests and type checks are passing, run command first -->
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

  async executeAction(actionContent: string): Promise<IActionResult> {
    return this.actionExecutor.executeAction(actionContent);
  }
}
