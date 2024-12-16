import { ConfigService } from "@services/ConfigService";
import { DirectoryScanner } from "@services/FileManagement/DirectoryScanner";
import { ActionExecutor } from "@services/LLM/actions/ActionExecutor";
import { IActionResult } from "@services/LLM/actions/types/ActionTypes";
import { ProjectInfo } from "@services/LLM/utils/ProjectInfo";
import { autoInjectable } from "tsyringe";
import { MessageContextCleaner } from "./context/MessageContextCleanup";
import { PhaseManager } from "./PhaseManager";
import { IPhasePromptArgs } from "./types/PhaseTypes";

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
    private phaseManager: PhaseManager,
    private messageContextCleanup: MessageContextCleaner,
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
      // Reset to discovery phase on first message
      this.phaseManager.resetPhase();
      // Clear message context only on first message
      this.messageContextCleanup.cleanupContext();

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
    const phaseConfig = this.phaseManager.getCurrentPhaseConfig();

    const envDetails = config.includeAllFilesOnEnvToContext
      ? context.environmentDetails
      : "";

    const promptArgs: IPhasePromptArgs = {
      message: context.message,
      environmentDetails: envDetails,
      projectInfo: context.projectInfo,
      runAllTestsCmd: config.runAllTestsCmd,
      runOneTestCmd: config.runOneTestCmd,
      runTypeCheckCmd: config.runTypeCheckCmd,
    };

    return `

    <task>
${context.message}
</task>
    
    <instructions details="NEVER_OUTPUT">
<!-- These are internal instructions. Just follow them. Do not output. -->
 

## Initial Instructions
- Keep messages brief, clear, and concise.
- Break tasks into prioritized steps.
- Use available actions sequentially. 

## Instructions

${phaseConfig.generatePrompt(promptArgs)}

</instructions>
`;
  }

  private formatSequentialMessage(context: MessageContext): string {
    const phaseConfig = this.phaseManager.getCurrentPhaseConfig();
    return phaseConfig.generatePrompt({ message: context.message });
  }

  async executeAction(actionContent: string): Promise<IActionResult> {
    const result = await this.actionExecutor.executeAction(actionContent);

    return result;
  }
}
