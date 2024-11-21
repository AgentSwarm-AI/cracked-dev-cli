import {
  FileNotFoundError,
  FileReadError,
  InvalidFileError,
} from "@services/FileManagement/Errors";
import fs from "fs/promises";
import { autoInjectable } from "tsyringe";

@autoInjectable()
export class FileReader {
  public async readInstructionsFile(path: string): Promise<string> {
    try {
      await this.validateFilePath(path);
      return await this.readFileContent(path);
    } catch (error) {
      if (
        error instanceof FileNotFoundError ||
        error instanceof FileReadError ||
        error instanceof InvalidFileError
      ) {
        throw new FileReadError(path, error.message);
      }
      throw error;
    }
  }

  private async validateFilePath(path: string): Promise<void> {
    const stats = await fs.stat(path);
    if (!stats.isFile()) {
      throw new InvalidFileError(path);
    }
  }

  private async readFileContent(path: string): Promise<string> {
    return await fs.readFile(path, "utf-8");
  }
}
