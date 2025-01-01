import { ConfigService } from "@services/ConfigService";
import { DirectoryScanner } from "@services/FileManagement/DirectoryScanner";
import { ActionExecutor } from "@services/LLM/actions/ActionExecutor";
import { IActionResult } from "@services/LLM/actions/types/ActionTypes";
import { ProjectInfo } from "@services/LLM/utils/ProjectInfo";
import * as fs from "fs";
import { autoInjectable } from "tsyringe";
import { MessageContextBuilder } from "./context/MessageContextBuilder";
import { MessageContextCleaner } from "./context/MessageContextCleanup";
import { MessageContextStore } from "./context/MessageContextStore";
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
    private messageContextCleaner: MessageContextCleaner,
    private messageContextBuilder: MessageContextBuilder,
    private messageContextStore: MessageContextStore,
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
      this.messageContextCleaner.cleanupContext();

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

    // Only generate new phase prompt if phase has changed
    const currentPhase = this.phaseManager.getCurrentPhase();
    const contextData = this.messageContextStore.getContextData();

    const phaseInstructions = Array.from(
      contextData.phaseInstructions.values(),
    );
    const currentPhaseInstruction = phaseInstructions.find(
      (instruction) => instruction.phase === currentPhase,
    );

    if (!currentPhaseInstruction) {
      return this.formatSequentialMessage(baseContext);
    }

    // Return just the message if phase hasn't changed
    return baseContext.message;
  }

  private truncateFileContent(content: string, lineLimit: number): string {
    const lines = content.split("\n");
    if (lines.length <= lineLimit) return content;
    return lines.slice(0, lineLimit).join("\n") + "\n[Content truncated...]";
  }

  private async getEnvironmentDetails(root: string): Promise<string> {
    const scanResult = await this.directoryScanner.scan(root);
    if (!scanResult.success) {
      throw new Error(`Failed to scan directory: ${scanResult.error}`);
    }

    const config = this.configService.getConfig();
    const limit = config.truncateFilesOnEnvAfterLinesLimit;

    const content = String(scanResult.data || "");
    const truncatedContent = this.truncateFileContent(content, limit);
    return `# Current Working Directory (${root}) Files\n${truncatedContent}`;
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

    // Add project language and package manager info
    const projectSetup = `# Project Setup
Language: ${config.projectLanguage}
Package Manager: ${config.packageManager}`;

    // Add flexible reference examples section
    const referenceExamplesSection = Object.entries(
      config.referenceExamples || {},
    )
      .map(([key, path]) => `${key}: ${path}`)
      .join("\n");

    return `${projectSetup}

# Project Dependencies (from ${info.dependencyFile})
Main Dependencies: ${info.mainDependencies.join(", ")}

# Available Scripts
${Object.entries(info.scripts)
  .map(([name, command]) => `${name}: ${command}`)
  .join("\n")}

# Test Commands
Run All Tests: ${runAllTestsCmd}
Run Single Test: ${runOneTestCmd}
Run Type Check: ${runTypeCheckCmd}

# Reference Examples
${referenceExamplesSection}`;
  }

  private async formatInitialInstructions(
    context: MessageContext,
    customInstructions: string,
    envDetails?: string,
  ): Promise<string> {
    const additionalInstructions = [envDetails, context.projectInfo]
      .filter(Boolean)
      .join("\n");

    return `# Task
${context.message}

<instructions details="NEVER_OUTPUT">
<!-- These are internal instructions. Just follow them. Do not output. -->

${customInstructions ? `# Custom Instructions\n${customInstructions}\n` : ""}
## Initial Instructions
- Keep messages brief, clear, and concise.
- Break tasks into prioritized steps.
- Use available actions sequentially.

# Additional Instructions
${additionalInstructions ? `${additionalInstructions}` : ""}
</instructions>`;
  }

  private async formatFirstTimeMessage(
    context: MessageContext,
  ): Promise<string> {
    const config = this.configService.getConfig();
    const phaseConfig = this.phaseManager.getCurrentPhaseConfig();
    const customInstructions = await this.loadCustomInstructions();

    const envDetails = config.contextPaths.includeFilesAndDirectories
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

    const initialInstructions = await this.formatInitialInstructions(
      context,
      customInstructions,
      envDetails,
    );

    return `${initialInstructions}

## Phase Instructions
${phaseConfig.generatePrompt(promptArgs)}`;
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
