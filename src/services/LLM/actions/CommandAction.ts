import chalk from "chalk";
import { spawn, SpawnOptionsWithoutStdio } from "child_process";
import { autoInjectable } from "tsyringe";
import { DebugLogger } from "../../logging/DebugLogger";
import { IActionResult } from "./types/ActionTypes";

@autoInjectable()
export class CommandAction {
  constructor(private debugLogger: DebugLogger) {}

  private extractCommand(command: string): string {
    const regex = /<execute_command>\s*([\s\S]*?)\s*<\/execute_command>/i;
    const match = command.match(regex);
    return match ? match[1].trim() : command.trim();
  }

  async execute(
    command: string,
    options?: SpawnOptionsWithoutStdio & { timeout?: number },
  ): Promise<IActionResult> {
    return new Promise((resolve) => {
      const cleanedCommand = this.extractCommand(command);

      if (!cleanedCommand) {
        return resolve({
          success: false,
          error: new Error("No valid command to execute."),
          data: "",
        });
      }

      const [cmd, ...args] = cleanedCommand.split(" ");
      const child = spawn(cmd, args, { ...options, shell: true });

      let stdoutData = "";
      let stderrData = "";
      let isResolved = false;

      // Handle standard output data
      child.stdout.on("data", (data: Buffer) => {
        const chunk = data.toString();
        stdoutData += chunk;
        // Stream stdout data in green
        process.stdout.write(chalk.green(chunk));
      });

      // Handle standard error data
      child.stderr.on("data", (data: Buffer) => {
        const chunk = data.toString();
        stderrData += chunk;
        // Stream stderr data in red
        process.stderr.write(chalk.red(chunk));
      });

      const finalizeAndResolve = (exitCode: number | null = null) => {
        if (!isResolved) {
          isResolved = true;
          const combinedOutput = stdoutData + stderrData;
          this.debugLogger.log("CommandAction", "Command execution completed", {
            command: cleanedCommand,
            exitCode,
            output: combinedOutput,
          });

          if (exitCode === 0) {
            resolve({
              success: true,
              data: combinedOutput,
            });
          } else {
            resolve({
              success: false,
              error: new Error(`Command failed with exit code ${exitCode}`),
              data: combinedOutput,
            });
          }
        }
      };

      child.on("close", (code) => {
        finalizeAndResolve(code);
      });

      child.on("error", (error) => {
        this.debugLogger.log("CommandAction", "Command execution error", {
          command: cleanedCommand,
          error: error.message,
        });
        resolve({
          success: false,
          error,
          data: error.message,
        });
      });

      if (options?.timeout) {
        setTimeout(() => {
          if (child.exitCode === null) {
            child.kill();
            this.debugLogger.log(
              "CommandAction",
              "Command execution timed out",
              {
                command: cleanedCommand,
              },
            );
            resolve({
              success: false,
              error: new Error("Command execution timed out"),
              data: "Timeout exceeded",
            });
          }
        }, options.timeout);
      }
    });
  }
}
