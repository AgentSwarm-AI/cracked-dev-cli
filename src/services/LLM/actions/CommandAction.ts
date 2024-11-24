import { IActionResult } from "@services/LLM/actions/types/ActionTypes";
import { DebugLogger } from "@services/logging/DebugLogger";
import { AnsiStripper } from "@services/text/AnsiStripper";
import chalk from "chalk";
import { spawn, SpawnOptionsWithoutStdio } from "child_process";
import { autoInjectable } from "tsyringe";
import { ActionTagsExtractor } from "./ActionTagsExtractor";
import { commandAction as blueprint } from "./blueprints/commandAction";
import { BaseAction } from "./core/BaseAction";
import { IActionMetadata } from "./core/IAction";
import { CommandError } from "./errors/CommandError";

interface CommandParams {
  command: string;
}

@autoInjectable()
export class CommandAction extends BaseAction {
  constructor(
    protected actionTagsExtractor: ActionTagsExtractor,
    private debugLogger: DebugLogger,
    private ansiStripper: AnsiStripper,
  ) {
    super(actionTagsExtractor);
  }

  protected getBlueprint(): IActionMetadata {
    return blueprint;
  }

  protected parseParams(content: string): Record<string, any> {
    const tag = this.getBlueprint().tag;
    const match = content.match(new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`));
    if (!match) {
      this.logError("Failed to parse command from content");
      return { command: "" };
    }

    // Extract the command from between the tags and trim whitespace
    const command = match[0]
      .replace(new RegExp(`^<${tag}>`), "")
      .replace(new RegExp(`<\\/${tag}>$`), "")
      .trim();

    this.logInfo(`Parsed command: ${command}`);
    return { command };
  }

  protected validateParams(params: Record<string, any>): string | null {
    const { command } = params as CommandParams;

    if (!command || command.trim().length === 0) {
      return "No valid command to execute";
    }

    return null;
  }

  protected async executeInternal(
    params: Record<string, any>,
  ): Promise<IActionResult> {
    try {
      const { command } = params as CommandParams;
      this.logInfo(`Executing command: ${command}`);
      return this.executeCommand(command);
    } catch (error) {
      this.logError(`Command execution failed: ${(error as Error).message}`);
      return this.createErrorResult(error as Error);
    }
  }

  private isTestEnvironment(): boolean {
    return (
      process.env.NODE_ENV === "test" ||
      process.env.JEST_WORKER_ID !== undefined
    );
  }

  private async executeCommand(
    command: string,
    options?: SpawnOptionsWithoutStdio,
  ): Promise<IActionResult> {
    return new Promise((resolve) => {
      const [cmd, ...args] = command.split(" ");
      const child = spawn(cmd, args, { ...options, shell: true });

      let stdoutData = "";
      let stderrData = "";
      let isResolved = false;

      // Buffers to handle partial ANSI codes
      let stdoutBuffer = "";
      let stderrBuffer = "";

      // Handle standard output data
      child.stdout.on("data", (data: Buffer) => {
        const chunk = data.toString();
        stdoutBuffer += chunk;
        const strippedChunk = this.ansiStripper.strip(stdoutBuffer);
        stdoutData += strippedChunk;
        stdoutBuffer = ""; // Reset buffer after processing

        // Only stream to console if not in test environment
        if (!this.isTestEnvironment()) {
          process.stdout.write(chalk.green(chunk));
        }
      });

      // Handle standard error data
      child.stderr.on("data", (data: Buffer) => {
        const chunk = data.toString();
        stderrBuffer += chunk;
        const strippedChunk = this.ansiStripper.strip(stderrBuffer);
        stderrData += strippedChunk;
        stderrBuffer = ""; // Reset buffer after processing

        // Only stream to console if not in test environment
        if (!this.isTestEnvironment()) {
          process.stderr.write(chalk.red(chunk));
        }
      });

      const finalizeAndResolve = (exitCode: number | null = null) => {
        if (!isResolved) {
          isResolved = true;
          // Process any remaining buffered data
          if (stdoutBuffer) {
            stdoutData += this.ansiStripper.strip(stdoutBuffer);
          }
          if (stderrBuffer) {
            stderrData += this.ansiStripper.strip(stderrBuffer);
          }

          const combinedOutput = stdoutData + stderrData;
          this.debugLogger.log("CommandAction", "Command execution completed", {
            command,
            exitCode,
            output: combinedOutput,
          });

          if (exitCode === 0) {
            resolve(this.createSuccessResult(combinedOutput));
          } else {
            const error = new CommandError(
              `Command failed with exit code ${exitCode}`,
              combinedOutput || "Command not found",
              exitCode,
            );
            resolve(this.createErrorResult(error));
          }
        }
      };

      child.on("close", (code) => {
        finalizeAndResolve(code);
      });

      child.on("error", (error) => {
        this.debugLogger.log("CommandAction", "Command execution error", {
          command,
          error: error.message,
        });
        const errorMessage = `${error.message}: command not found`;
        resolve(
          this.createErrorResult(new CommandError(errorMessage, errorMessage)),
        );
      });
    });
  }
}
