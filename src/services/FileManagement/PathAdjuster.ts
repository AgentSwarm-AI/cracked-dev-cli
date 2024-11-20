import fg from "fast-glob";
import fsExtra from "fs-extra";
import * as Fuse from "fuse.js";
import path from "path";
import { autoInjectable } from "tsyringe";

/**
 * PathAdjuster Class
 *
 * This class is responsible for adjusting incorrect file paths by finding the closest matching existing path.
 * It uses fast-glob for efficient file discovery, Fuse.js for fuzzy matching, and fs-extra for file system operations.
 */
@autoInjectable()
export class PathAdjuster {
  private allFiles: string[] = [];
  private fuse: Fuse.default<string>;
  private initialized: boolean = false;
  private initializationError: Error | null = null;
  private baseDirectory: string = process.cwd();

  constructor() {
    const defaultFuzzyOptions: Fuse.IFuseOptions<string> = {
      includeScore: true,
      threshold: 0.4,
    };

    this.fuse = new Fuse.default([], defaultFuzzyOptions);

    this.initialize().catch((error) => {
      this.initializationError = error;
      console.error("Failed to initialize PathAdjuster:", error);
    });
  }

  public async cleanup(): Promise<void> {
    // No cleanup needed
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public getInitializationError(): Error | null {
    return this.initializationError;
  }

  private async initialize(): Promise<void> {
    try {
      this.allFiles = await this.getAllFiles(this.baseDirectory);
      this.fuse.setCollection(this.allFiles);
      this.initialized = true;
      this.initializationError = null;
    } catch (error) {
      this.initialized = false;
      this.initializationError =
        error instanceof Error ? error : new Error(String(error));
      throw this.initializationError;
    }
  }

  private async getAllFiles(dir: string): Promise<string[]> {
    try {
      const entries = await fg.sync("**/*", {
        cwd: dir,
        absolute: true,
        onlyFiles: true,
        followSymbolicLinks: true,
      });
      return entries.map((filePath) => path.resolve(filePath));
    } catch (error) {
      throw new Error(
        `Failed to fetch files: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  public findClosestMatch(
    wrongPath: string,
    threshold: number = 0.6,
  ): string | null {
    if (!this.initialized) {
      throw new Error(
        "PathAdjuster not initialized. Check initialization status with isInitialized()",
      );
    }

    const absoluteWrongPath = path.resolve(this.baseDirectory, wrongPath);

    const results = this.fuse.search(absoluteWrongPath, { limit: 1 });

    if (results.length > 0) {
      const bestMatch = results[0];
      if (bestMatch.score !== undefined && bestMatch.score <= 1 - threshold) {
        return bestMatch.item;
      }
    }

    return null;
  }

  public validatePath(filePath: string): boolean {
    try {
      const exists = fsExtra.pathExistsSync(filePath);
      if (!exists) return false;
      
      const stats = fsExtra.lstatSync(filePath);
      return stats.isFile();
    } catch (error) {
      return false;
    }
  }

  public async adjustPath(
    wrongPath: string,
    threshold: number = 0.6,
  ): Promise<string | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    const closestMatch = this.findClosestMatch(wrongPath, threshold);
    if (closestMatch && this.validatePath(closestMatch)) {
      return closestMatch;
    }

    return null;
  }

  public toRelativePath(absolutePath: string): string {
    if (!path.isAbsolute(absolutePath)) {
      const possiblePath = path.join(this.baseDirectory, absolutePath);
      if (this.validatePath(possiblePath)) {
        return absolutePath;
      }
    }

    const normalizedPath = path.resolve(absolutePath);

    if (!normalizedPath.startsWith(this.baseDirectory)) {
      throw new Error("Path is outside the base directory");
    }

    return path.relative(this.baseDirectory, normalizedPath);
  }

  public async refreshFilePaths(): Promise<void> {
    try {
      this.allFiles = await this.getAllFiles(this.baseDirectory);
      this.fuse.setCollection(this.allFiles);
    } catch (error) {
      console.error("Error refreshing file paths:", error);
      throw error;
    }
  }
}