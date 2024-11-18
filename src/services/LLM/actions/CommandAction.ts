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
      return {
        success: !stderr,
        data: stdout,
        error: stderr ? new Error(stderr) : undefined,
      };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }
}
