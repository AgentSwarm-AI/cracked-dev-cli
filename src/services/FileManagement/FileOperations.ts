import { FileSearch } from "@services/FileManagement/FileSearch";
import { PathAdjuster } from "@services/FileManagement/PathAdjuster";
import {
  IFileOperationResult,
  IFileOperations,
  IFileStats,
} from "@services/FileManagement/types/FileManagementTypes";
import { DebugLogger } from "@services/logging/DebugLogger";
import fs from "fs-extra";
import path from "path";
import { autoInjectable } from "tsyringe";

@autoInjectable()
export class FileOperations implements IFileOperations {
  constructor(
    private pathAdjuster: PathAdjuster,
    private fileSearch: FileSearch,
    private debugLogger: DebugLogger,
  ) {}

  private async ensureInitialized(timeout: number = 5000): Promise<void> {
    const startTime = Date.now();

    // Wait for initialization if not already initialized
    if (!this.pathAdjuster.isInitialized()) {
      await new Promise<void>((resolve, reject) => {
        const checkInit = () => {
          if (this.pathAdjuster.isInitialized()) {
            resolve();
          } else if (Date.now() - startTime > timeout) {
            reject(new Error("PathAdjuster initialization timed out"));
          } else {
            setTimeout(checkInit, 10);
          }
        };
        checkInit();
      });
    }

    // Check for initialization errors
    const error = this.pathAdjuster.getInitializationError();
    if (error) {
      throw error;
    }
  }

  async getAdjustedPath(filePath: string): Promise<string> {
    await this.ensureInitialized();
    const adjustedPath = await this.pathAdjuster.adjustPath(filePath);
    return adjustedPath || filePath;
  }

  private async adjustPath(
    filePath: string,
    isRead: boolean = false,
  ): Promise<string> {
    await this.ensureInitialized();

    // If path exists, return as is
    if (await fs.pathExists(filePath)) {
      return filePath;
    }

    // Only perform fuzzy search for read operations
    if (isRead) {
      // For read operations, try to find similar files
      const similarFiles = await this.fileSearch.findByName(
        path.basename(filePath),
        process.cwd(),
      );
      if (similarFiles.length > 0) {
        const bestMatch = similarFiles[0];
        this.debugLogger.log(
          "FileOperations",
          `Found similar file: ${bestMatch} for ${filePath}`,
        );
        return bestMatch;
      }
    }

    // If no similar files found or not a read operation, try PathAdjuster
    const adjustedPath = await this.pathAdjuster.adjustPath(filePath);
    if (adjustedPath && (await fs.pathExists(adjustedPath))) {
      this.debugLogger.log(
        "FileOperations > PathAdjuster",
        `Adjusted path: ${adjustedPath}`,
      );
      return adjustedPath;
    }

    return filePath;
  }

  async read(filePath: string): Promise<IFileOperationResult> {
    try {
      const adjustedPath = await this.adjustPath(filePath, true);
      if (!(await fs.pathExists(adjustedPath))) {
        return {
          success: false,
          error: new Error(`File does not exist: ${filePath}`),
        };
      }
      const content = await fs.readFile(adjustedPath, "utf-8");
      return { success: true, data: content };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  async readMultiple(filePaths: string[]): Promise<IFileOperationResult> {
    try {
      if (!filePaths?.length) {
        return { success: false, error: new Error("No files provided") };
      }

      const fileContents: string[] = [];
      const errors: string[] = [];

      for (const filePath of filePaths) {
        try {
          const adjustedPath = await this.adjustPath(filePath);
          if (!(await fs.pathExists(adjustedPath))) {
            errors.push(`${filePath}: File does not exist`);
            continue;
          }
          const content = await fs.readFile(adjustedPath, "utf-8");
          if (content) {
            fileContents.push(`[File: ${adjustedPath}]\n${content}`);
          } else {
            errors.push(`${adjustedPath}: Empty content`);
          }
        } catch (error) {
          errors.push(`${filePath}: ${(error as Error).message}`);
        }
      }

      if (errors.length > 0) {
        return {
          success: false,
          error: new Error(
            `Failed to read files: ${errors.join(", ")}. Try using search_file action to find the proper path.`,
          ),
        };
      }

      return { success: true, data: fileContents.join("\n\n") };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  private async validateAndAdjustWritePath(filePath: string): Promise<{
    adjustedPath: string;
    isNewFile: boolean;
  }> {
    // For write operations, we want to be very strict
    // Only use the exact path or create a new file
    const absolutePath = path.resolve(process.cwd(), filePath);

    // First check if file exists at exact path
    if (await fs.pathExists(filePath)) {
      return { adjustedPath: filePath, isNewFile: false };
    }

    // For new files, just ensure the path is within the project
    const projectRoot = process.cwd();
    if (!absolutePath.startsWith(projectRoot)) {
      throw new Error(`File path must be within project root: ${projectRoot}`);
    }

    // This is a new file
    return { adjustedPath: filePath, isNewFile: true };
  }

  async write(
    filePath: string,
    content: string | Buffer,
  ): Promise<IFileOperationResult> {
    try {
      const { adjustedPath, isNewFile } =
        await this.validateAndAdjustWritePath(filePath);

      if (!isNewFile) {
        this.debugLogger.log(
          "FileOperations",
          `Writing to existing file at: ${adjustedPath}`,
        );
      } else {
        this.debugLogger.log(
          "FileOperations",
          `Creating new file at: ${adjustedPath}`,
        );
      }

      await fs.ensureDir(path.dirname(adjustedPath));
      await fs.writeFile(adjustedPath, content);
      return { success: true };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  async delete(filePath: string): Promise<IFileOperationResult> {
    try {
      const adjustedPath = await this.adjustPath(filePath);
      if (!(await fs.pathExists(adjustedPath))) {
        return {
          success: false,
          error: new Error(`File does not exist: ${filePath}`),
        };
      }
      await fs.remove(adjustedPath);
      return { success: true };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  async copy(
    source: string,
    destination: string,
  ): Promise<IFileOperationResult> {
    try {
      const adjustedSource = await this.adjustPath(source);
      if (!(await fs.pathExists(adjustedSource))) {
        return {
          success: false,
          error: new Error(`Source file does not exist: ${source}`),
        };
      }
      await fs.ensureDir(path.dirname(destination));
      await fs.copy(adjustedSource, destination);
      return { success: true };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  async move(
    source: string,
    destination: string,
  ): Promise<IFileOperationResult> {
    try {
      const adjustedSource = await this.adjustPath(source);
      if (!(await fs.pathExists(adjustedSource))) {
        return {
          success: false,
          error: new Error(`Source file does not exist: ${source}`),
        };
      }
      await fs.ensureDir(path.dirname(destination));
      await fs.move(adjustedSource, destination, { overwrite: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  async exists(filePath: string): Promise<boolean> {
    const adjustedPath = await this.adjustPath(filePath);
    return fs.pathExists(adjustedPath);
  }

  async stats(filePath: string): Promise<IFileOperationResult> {
    try {
      const adjustedPath = await this.adjustPath(filePath);
      if (!(await fs.pathExists(adjustedPath))) {
        return {
          success: false,
          error: new Error(`File does not exist: ${filePath}`),
        };
      }
      const stats = await fs.stat(adjustedPath);
      const fileStats: IFileStats = {
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        isDirectory: stats.isDirectory(),
        path: adjustedPath,
      };
      return { success: true, data: fileStats };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }
}
