import { exec } from "child_process";
import { autoInjectable } from "tsyringe";
import { promisify } from "util";
import { IActionResult } from "./types/ActionTypes";

const execAsync = promisify(exec);

@autoInjectable()
export class CommandAction {
  async execute(command: string): Promise<IActionResult> {
    try {
      const { stdout, stderr } = await execAsync(command);
      if (stderr) {
        throw new Error("Command not found"); // Ensure the correct error message
      }
      return {
        success: true,
        data: stdout,
        error: undefined,
      };
    } catch (error) {
      throw new Error(`Command failed: ${error.message}`); // Maintain error logging
    }
  }
}