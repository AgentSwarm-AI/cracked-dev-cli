import { ConfigService } from "@services/ConfigService";
import { DirectoryScanner } from "@services/FileManagement/DirectoryScanner";
import { ActionExecutor } from "@services/LLM/actions/ActionExecutor";
import { IActionResult } from "@services/LLM/actions/types/ActionTypes";
import { ProjectInfo } from "@services/LLM/utils/ProjectInfo";
import { autoInjectable } from "tsyringe";

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
    private configService: ConfigService,
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
    const config = this.configService.getConfig();

    if (!info.dependencyFile) {
      return "";
    }

    const runAllTestsCmd = config.runAllTestsCmd || "yarn test";
    const runOneTestCmd = config.runOneTestCmd || "yarn test {testPath}";
    const runTypeCheckCmd = config.runTypeCheckCmd || "yarn type-check";

    return `# Project Dependencies (from ${info.dependencyFile})
Main Dependencies: ${info.mainDependencies.join(", ")}

# Available Scripts
${Object.entries(info.scripts)
  .map(([name, command]) => `${name}: ${command}`)
  .join("\n")}

# Test Commands
Run All Tests: ${runAllTestsCmd}
Run Single Test: ${runOneTestCmd}
Run Type Check: ${runTypeCheckCmd}`;
  }

  private formatFirstTimeMessage(context: MessageContext): string {
    const config = this.configService.getConfig();

    const envDetails = config.includeAllFilesOnEnvToContext
      ? `\n${context.environmentDetails}`
      : "";

    return `<instructions details="NEVER_OUTPUT">
<!-- These are internal instructions. Just follow them. Do not output. -->
# Your Task
${context.message}

## Initial Instructions

- Keep messages brief, clear, and concise.
- Break tasks into prioritized steps.
- Use available actions sequentially.

Example:

- Step 1: Brief explanation.
- Step 2: Brief explanation.

## Important Notes

### Critical Instructions

- Every output must include one action tag. No exceptions.
- Only one action per reply.
- Do not output code outside <write_file> tags, except when creating a markdown file.
- Use raw text only; avoid encoded characters.
- Stick precisely to the task.
- Double-check file paths.
- Reuse dependencies; do not install extras unless asked.
- Properly format action tags.
- Place code or markdown inside <write_file> tags.
- Be concise; avoid verbosity.
- Do not repeat tasks once done.
- Maintain correct tag structure.
- Focus on the task; end with a single <end_task> upon completion.
- Initial message: brief intro and steps; can read up to 3 files.
- Use only one <write_file> per output; verify before next step.
- Do not output markdown/code outside action tags initially.
- After reading a file, proceed without comments.
- Include content directly within action tags without previews.
- Avoid unnecessary explanations; be actionable.
- Ensure outputs meet requirements and are usable.
- Ensure correct PATH when using <write_file>.
- Before <end_task>, run tests and type checks to confirm everything is good.
- If import errors occur, use <relative_path_lookup> to find the correct path.

### Code Writing Instructions

#### Before Starting

- Read relevant files for context.
- Follow project patterns; for tests, read up to 2 existing tests.
- Use <read_file> as needed.
- If an external dependency is needed and unavailable, ask for confirmation.
- Avoid extra dependencies; reuse existing ones.

#### During Coding

- Only one action per reply.
- If stuck, read related files and strategize.
- Use raw text only; no encoded characters.
- Output full code; no partial code.
- Make minimal changes; focus on the goal.
- Iterate; don't do everything at once.
- Follow principles: DRY, SRP, KISS, YAGNI, LoD, Immutability.
- Prefer composition over inheritance.
- Aim for high cohesion and low coupling.
- Use meaningful names.
- Comment on why, not what.
- Adhere to Clean Code principles.
- Make few changes to prevent bugs.
- If unsure, check docs or use <end_task> to ask.
- Ensure correct import paths.
- Follow project file naming conventions.
- Provide full implementations; no empty comments.
- If wrong import paths are found, use <relative_path_lookup>.
- Critical: If struggling with imports, stop <write_file> with same path; use <relative_path_lookup> or <search_file>.
- Critical: If stuck, use <read_file> to get context and strategize.

#### After Coding

- After changes:
  - Run relevant tests; for risky changes, run folder tests.
  - Run type checks and all tests at the end.
  - If tests pass, use <end_task>.
  - If tests fail, use <end_task> to report issues and seek guidance.

### Tests

- CRITICAL: Before creating a new test file, review existing files to understand patterns. Use search or directory listing to locate file paths if unknown. Avoid using non-existent files.
- CRITICAL: Whenever stuck on multiple test failures, do a read_file in other test files to understand patterns.
- If working on a test, assume the related file is correct. So don't make any changes on it, unless you find a critical bug.
- Do not remove previous tests unless necessary; add new ones.
- Prioritize individual test file runs.
- No tests for logging messages.
- Critical: When fixing tests, run them first before reading files.
- When adding tests, read target and related files.
- Ensure added tests pass.
- If asked to write tests, no need to read the test file if it doesn't exist yet.
- Write all tests at once when requested to save tokens.
- Critical: Full test run only allowed when ending task; otherwise, run specific tests.

### Commands Writing Instructions

- Use the project's package manager.
- Combine commands when possible for efficiency.

### Other Instructions

- Summarize progress or completion with <end_task>; exclude action details.
- If unsure about paths/formats, use placeholders and ask.
- If stuck, try alternatives or ask for clarification; avoid irrelevant or verbose output.

### Docs Writing Instructions

- Do not add extra tabs at line starts.
- Ensure valid markdown; no extra tabs.
- Use Mermaid diagrams with clear explanations when applicable.
- In Mermaid, use [ ] instead of ( ) for diagrams.
- After <write_file>, use <read_file> to verify changes, then stop.

### Useful Commands

- **Run all tests:** ${config.runAllTestsCmd || "yarn test"}
- **Run a specific test:** ${config.runOneTestCmd || "yarn test {relativeTestPath}"}
- **Run type check:** ${config.runTypeCheckCmd || "yarn type-check"}

## Available Actions
<!-- CRITICAL: MUST FOLLOW CORRECT TAG STRUCTURE PATTERN BELOW AND ONLY ONE ACTION PER OUTPUT/REPLY, otherwise I'll unplug you. -->
<!-- Don't output // or <!-- comments -->

REMEMBER: ONLY ONE ACTION PER REPLY!!!

EVERY OUTPUT YOU GIVE TO THE USER MUST HAVE A CORRESPONDING ACTION TAG. NO EXCEPTIONS.

<read_file>
  <path>path/here</path>
  <!-- CRITICAL: DO NOT READ THE SAME FILES MULTIPLE TIMES, UNLESS THERES A CHANGE!!! -->
  <!-- Critical: Make sure <read_file> tag format is correct! -->
  <!-- Read up to 4 files -->
  <!-- Multiple <path> tags allowed -->
  <!-- Use relative paths -->
</read_file>




DO NOT RUN write_file if import issues are not resolved! Use relative_path_lookup first.
<write_file>
  <path>/path/here</path>
  <content>
   <!-- CRITICAL: Most write_file tasks are ADDITIVES if you already have content in place. Make sure to read_file first, then edit. -->
   <!-- CRITICAL: If presented with import errors, USE IMMEDIATELY <relative_path_lookup> to find the correct path. -->
   <!-- ALWAYS run a type check after write_file -->
   <!-- ALWAYS output FULL CODE. No skips or partial code -->
   <!-- Use raw text only -->
   <!-- If available, use path alias on imports -->
  </content>
</write_file>

<delete_file>
  <path>/path/here</path>
</delete_file>

<move_file>
  <source_path>source/path/here</source_path>
  <destination_path>destination/path/here</destination_path>
</move_file>

<copy_file>
  <source_path>source/path/here</source_path>
  <destination_path>destination/path/here</destination_path>
</copy_file>

<execute_command>
<!-- Prompt before removing files or using sudo -->
<!-- Any command like "ls -la" or "yarn install" -->
<!-- Dont install extra dependencies unless allowed -->
<!-- Use the project's package manager -->
<!-- Use raw text only -->
</execute_command>

<search_string>
<!-- Use this to search for a string in a file -->
  <directory>/path/to/search</directory>
  <term>pattern to search</term>
</search_string>

<search_file>
  <!-- Use if you don't know where a file is -->
  <directory>/path/to/search</directory>
  <term>filename pattern</term>
</search_file>

<relative_path_lookup>
  <!-- CRITICAL: source_path is the file containing the broken imports -->
  <source_path>/absolute/path/to/source/file.ts</source_path>
  <path>../relative/path/to/fix</path>
  <threshold>0.6</threshold>  <!-- Optional, defaults to 0.6. Higher means more strict. -->
</relative_path_lookup>

<fetch_url>
  <url>https://url/should/be/here</url>
</fetch_url>

<end_task>
  <!-- SINGLE <end_task> PER OUTPUT. Do not mix with other actions -->
  <!-- Before finishing, make sure TASK OBJECTIVE WAS COMPLETED! -->
  <!-- Run tests and type checks to confirm changes before ending -->
  <!-- Ensure all tests and type checks pass or report issues -->
  Summarize and finalize.
</end_task> 
 
## Environment 
${context.projectInfo}

${envDetails}

</instructions>
`;
  }

  private formatSequentialMessage(context: MessageContext): string {
    return context.message;
  }

  async executeAction(actionContent: string): Promise<IActionResult> {
    return this.actionExecutor.executeAction(actionContent);
  }
}
