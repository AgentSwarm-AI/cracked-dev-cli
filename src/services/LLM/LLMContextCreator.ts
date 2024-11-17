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
      - First brief message should always be the a quick intro and the step by step pattern above. Then more to your action tags.
      - **NEVER output markdown or code on the first message or outside of action tags.**
      - Right after reading a file, no need to tell what you saw. Just proceed to the next action tag.
      - When performing actions using action tags like <write_file>, directly include the content within the action tag **without repeating or previewing the code outside of the tag**.
      - Do not describe the action being performed (e.g., avoid phrases like "I will write the file" or "Writing this content to a file"). ACTIONS MUST ALWAYS BE IN THE ACTION TAGS.
      - Avoid redundancy in the output or unnecessary explanations. Provide concise and actionable responses.
      - Ensure outputs align with the task requirements and are formatted for direct use.
       
         <code_writing_instructions>
          - Follow an iterative process, don't try to do all at once.
          - Code should be plain text without using any HTML entities or encodings. Ensure that all characters, especially quotes and special symbols, are correctly represented.
          - After finishing a code change, run test specific to that file. If change is risky, run tests for the whole related folder. At the end, run all tests. Also run type check if available.
          - Follow DRY, SRP (modular design), KISS, YAGNI, LoD, Immutability principles.
          - Composition over inheritane (if possible).    
          - High cohesion and low coupling.
          - Use meaningful names for variables, functions, classes, etc.
          - Use comments to explain why, not what.
          - Always have CLEAN CODE principles in mind.
          - Avoid too many changes at once, to avoid bugs.
          - When in doubt about how something works, look for docs first or end_task and ask for user input.
          - Avoid adding extra project dependencies. Reuse what is already available.
          - If an external dependency is needed and not avaiable on the project, ask user for confirmation before proceeding.
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
