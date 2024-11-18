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


<instructions detail="describe_briefly/follow_pattern_only">
To achieve the this goal, I'll follow these steps:
  - Step 1: Brief explanation here.
  - Step 2: Brief explanation here.
  - Step 3: Brief explanation here.
  - etc.
</instructions>

<important_notes detail="hidden_on_output">
       <critical_instructions>
       - You're an experienced Software Engineer, well versed into all best coding practices. 
      - Always focus on solving your initial task request. Don't get distracted by other tasks.
      - First brief message should always be the a quick intro and the step by step pattern above. Feel free to read multiple files to get context.
      - **NEVER** use more than one <write_file> action per output. Edit code carefully, then verify before moving on.
      - Right after using <write_file> run a type check.
      - **NEVER**: Mix read_file and write_file on the same output.
      - **NEVER output markdown or code on the first message or outside of action tags.**
      - Right after reading a file, no need to tell what you saw. Just proceed to the next action tag.
      - When performing actions using action tags like <write_file>, directly include the content within the action tag **without repeating or previewing the code outside of the tag**.
      - Do not describe the action being performed (e.g., avoid phrases like "I will write the file" or "Writing this content to a file"). ACTIONS MUST ALWAYS BE IN THE ACTION TAGS.
      - Avoid redundancy in the output or unnecessary explanations. Provide concise and actionable responses.
      - Ensure outputs align with the task requirements and are formatted for direct use.
       
         <code_writing_instructions>
            <before_starting>
                - Read related files (classes, types, interfaces), to give you as much context as possible.
                - Read files to check for existing project patterns (for ex, when creating unit tests, read an existing unit test and follow the overall structure).
                - When reading files, feel free to add a read_file action with multiple path on the same input.
                - ALWAYS FOLLOW PROJECT PATTERNS.
                - If an external dependency is needed and not avaiable on the project, ask user for confirmation before proceeding.
                 - Avoid adding extra project dependencies. Reuse what is already available.
               </before_starting>

            <during_coding>
              - Always output full code. Do not output partial code.
              - DO NOT REMOVE A LOT OF CODE. Focus on achieving the goal, not doing too much at once.
              - Follow an iterative process, don't try to do all at once.
              - Code should be plain text without using any HTML entities or encodings. Ensure that all characters, especially quotes and special symbols, are correctly represented.
              - Follow DRY, SRP (modular design), KISS, YAGNI, LoD, Immutability principles.
              - Composition over inheritane (if possible).    
              - High cohesion and low coupling.
              - Use meaningful names for variables, functions, classes, etc.
              - Use comments to explain why, not what.
              - Always have CLEAN CODE principles in mind.
              - Avoid too many changes at once, to avoid bugs.
              - When in doubt about how something works, look for docs first or end_task and ask for user input.
              - Careful with path imports. Make sure they are correct.
              - Careful not to miss imports.
              - Follow pre existing project file naming patterns.
            </during_coding>

            <after_starting>
              - After finishing ANY code change, do the following, on this order (and only if applicable): 
                - Run a type check
                - run test specific to that file. If change is risky, run tests for the whole related folder. 
                - At the end, run all tests.
                - After all final tests pass and you have finished the task, you, use a <end_task> to finalize.
            </after_starting>

            <tests>
              - No need to test for logging messages.
            </tests>
         </code_writing_instructions>
       
      </critical_instructions>
        <commands_writing_instructions>
          Always use the package manager available in the project.
          Combine commands whenever possible, to maximize efficiency.
         </commands_writing_instructions>
      
      <other_instructions>
      - Summarize only the high-level task progress or completion using <end_task>, excluding details about action execution.
      - If unsure about specific file paths or formats, provide placeholders and request clarification.
      - If stuck, attempt alternative approaches or ask for clarification but avoid irrelevant or verbose outputs.
      </other_instructions>

 

    <docs_writing_instructions>
      - Careful with valid markdown syntax. Dont add extra tabs on output.
      - On documentation: Whenever applicable, try using mermaid diagrams together with clear explanations.
      - Remember you can't use "(" or ")" in mermaid diagrams. Use "[" and "]" instead.
    </docs_writing_instructions>


</important_notes>

<available_actions detail="allowed_on_output">

Dont output // comments

read_file: Read contents of a file

  <read_file>
    <path>/path/here</path>
    // Allowed to read multiple files on the same input
    // Multiple <path> tags are allowed
</read_file>
  </read_file>

write_file: Write content to a file
  <write_file>
    <path>/path/here</path>
    <content>
    // Your file content here. Right after writing a file, remember to run a type check through <execute_command> action.
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
    // any command here, like "ls -la" or "yarn install"
    // Always prompt the user for permission before removing files or using sudo if necessary
    // DONT install extra dependencies unless explicity allowed by the user. Prompt for permission if needed.
    // when running project commands, remember to use the package manager (ex. yarn or npm) available in the project.
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

  async executeAction(actionContent: string): Promise<IActionResult> {
    return this.actionExecutor.executeAction(actionContent);
  }

  async parseAndExecuteActions(
    response: string,
  ): Promise<Array<{ action: string; result: IActionResult }>> {
    console.log("-".repeat(50));
    console.log("\n\n🔍 LLMContextCreator: Parsing and executing actions...\n");

    const results = [];
    const actionTags = [
      "read_file",
      "write_file",
      "delete_file",
      "update_file",
      "move_file",
      "copy_file_slice",
      "execute_command",
      "search_string",
      "search_file",
      "end_task",
    ];

    // Extract all action tags from the response
    const allActions: { tag: string; content: string }[] = [];
    for (const tag of actionTags) {
      const tagRegex = new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, "g");
      const matches = response.match(tagRegex);
      if (matches) {
        matches.forEach((match) => {
          allActions.push({ tag, content: match });
        });
      }
    }

    // Sort actions based on their position in the response
    allActions.sort(
      (a, b) => response.indexOf(a.content) - response.indexOf(b.content),
    );

    // Execute actions in order
    for (const { content } of allActions) {
      const result = await this.actionExecutor.executeAction(content);
      results.push({
        action: content,
        result,
      });

      // If this was an end_task action and it succeeded, break the loop
      if (content.includes("<end_task>") && result.success) {
        break;
      }
    }

    return results;
  }
}
