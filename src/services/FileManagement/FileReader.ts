import fs from "fs/promises";
import { autoInjectable } from "tsyringe";

@autoInjectable()
export class FileReader {
  public async readInstructionsFile(path: string): Promise<string> {
    try {
      const stats = await fs.stat(path);
      if (!stats.isFile()) {
        throw new Error("Instructions path must be a file");
      }
      return await fs.readFile(path, "utf-8");
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to read instructions file: ${error.message}`);
      }
      throw error;
    }
  }
}
