import { readFile, stat } from "fs/promises";
import { autoInjectable } from "tsyringe";

@autoInjectable()
export class FileReader {
  public async readInstructionsFile(filePath: string): Promise<string> {
    try {
      await this.validateFilePath(filePath);
      return await this.readFileContent(filePath);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to read instructions file at ${filePath}: ${error.message}`,
        );
      }
      throw error;
    }
  }

  private async validateFilePath(filePath: string): Promise<void> {
    const stats = await stat(filePath);
    if (!stats.isFile()) {
      throw new Error(`Provided path ${filePath} is not a file`);
    }
  }

  private async readFileContent(filePath: string): Promise<string> {
    return readFile(filePath, "utf-8");
  }
}
