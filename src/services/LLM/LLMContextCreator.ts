import { ConfigService } from "@services/ConfigService";
import { DirectoryScanner } from "@services/FileManagement/DirectoryScanner";
import { ActionExecutor } from "@services/LLM/actions/ActionExecutor";
import { IActionResult } from "@services/LLM/actions/types/ActionTypes";
import { ProjectInfo } from "@services/LLM/utils/ProjectInfo";
import * as fs from "fs";
import { autoInjectable, inject } from "tsyringe";
import { MessageContextManager } from "./context/MessageContextManager";
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
    @inject(DirectoryScanner) private directoryScanner: DirectoryScanner,
    @inject(ActionExecutor) private actionExecutor: ActionExecutor,
    @inject(ProjectInfo) private projectInfo: ProjectInfo,
    @inject(ConfigService) private configService: ConfigService,
    @inject(PhaseManager) private phaseManager: PhaseManager,
    @inject(MessageContextManager)
    private messageContextManager: MessageContextManager,
  ) {}

  private async loadCustomInstructions(): Promise<string> {
    const config = this.configService.getConfig();

    if (config.customInstructionsPath) {
      try {
        const instructions = await fs.promises.readFile(
          config.customInstructionsPath,
          "utf-8",
        );
        return instructions.trim();
      } catch (error) {
        throw Error(
          `Failed to load custom instructions from ${config.customInstructionsPath}, check if the file exists and is accessible.`,
        );
      }
    }

    if (config.customInstructions) {
      return config.customInstructions;
    }

    throw new Error(
      "No custom instructions provided. Either customInstructionsPath or customInstructions must be set in config.",
    );
  }

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
      this.messageContextManager.clear();

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

  private async formatFirstTimeMessage(
    context: MessageContext,
  ): Promise<string> {
    const config = this.configService.getConfig();
    const phaseConfig = this.phaseManager.getCurrentPhaseConfig();
    const customInstructions = await this.loadCustomInstructions();

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

    return `<instructions details="NEVER_OUTPUT">
<!-- These are internal instructions. Just follow them. Do not output. -->

# Your Main Task
${context.message}

${
  customInstructions &&
  `
# Custom Instructions
${customInstructions}`
}

## Initial Instructions
- Keep messages brief, clear, and concise.
- Break tasks into prioritized steps.
- Use available actions sequentially.

# Additional Instructions
${envDetails ? `\n${envDetails}` : ""}
${context.projectInfo ? `\n${context.projectInfo}` : ""}

## Phase Instructions
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
