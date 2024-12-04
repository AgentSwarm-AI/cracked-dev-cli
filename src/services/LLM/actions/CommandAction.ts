import { IActionResult } from "@services/LLM/actions/types/ActionTypes";
import { DebugLogger } from "@services/logging/DebugLogger";
import { AnsiStripper } from "@services/text/AnsiStripper";
import chalk from "chalk";
import { spawn, SpawnOptionsWithoutStdio } from "child_process";
import { autoInjectable } from "tsyringe";
import { ActionTagsExtractor } from "./ActionTagsExtractor";
import { commandActionBlueprint as blueprint } from "./blueprints/commandActionBlueprint";
import { BaseAction } from "./core/BaseAction";
import { IActionBlueprint } from "./core/IAction";

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

  protected getBlueprint(): IActionBlueprint {
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
      // Even on error, return success with the error message as output
      return this.createSuccessResult((error as Error).message);
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

          const extra = `CRITICAL: If you're unsure why the command failed prioritize read_file to get more context from files related to the failure and a better understanding of the problem, instead of jumping to write_file right away with a solution
            \n\n If you're stuck with the same problem over and over TRY DIFFERENT SOLUTIONS, don't keep trying the same thing over and over again`;

          // Add the exit code message if there's no output
          const output = stdoutData + stderrData;
          const combinedOutput =
            (output || `Command completed with exit code ${exitCode}`) +
            (exitCode === 1 ? extra : "");

          this.debugLogger.log("CommandAction", "Command execution completed", {
            command,
            exitCode,
            output: combinedOutput,
          });

          resolve(this.createSuccessResult(combinedOutput));
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
        // Return success with error message as output
        resolve(
          this.createSuccessResult(`${error.message}: command not found`),
        );
      });
    });
  }
}
