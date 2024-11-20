import fg from "fast-glob";
import * as fs from "fs-extra";
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

  /**
   * Creates an instance of PathAdjuster.
   * Note: The instance needs to be initialized before use. Either await the initialization
   * or use isInitialized() to check the status.
   */
  constructor() {
    const defaultFuzzyOptions: Fuse.IFuseOptions<string> = {
      includeScore: true,
      threshold: 0.4,
    };

    this.fuse = new Fuse.default([], defaultFuzzyOptions);

    // Start initialization but don't block constructor
    this.initialize().catch((error) => {
      this.initializationError = error;
      console.error("Failed to initialize PathAdjuster:", error);
    });
  }

  /**
   * Cleanup method to ensure resources are properly released
   */
  public async cleanup(): Promise<void> {
    // No cleanup needed
  }

  /**
   * Checks if the PathAdjuster is ready for use
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Gets the initialization error if any occurred
   */
  public getInitializationError(): Error | null {
    return this.initializationError;
  }

  /**
   * Initializes the PathAdjuster by loading all file paths and setting up Fuse.js.
   */
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

  /**
   * Recursively collects all file paths within the base directory using fast-glob.
   */
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

  /**
   * Finds the closest matching file path to the provided wrong path using Fuse.js.
   */
  public findClosestMatch(
    wrongPath: string,
    threshold: number = 0.6,
  ): string | null {
    if (!this.initialized) {
      throw new Error(
        "PathAdjuster not initialized. Check initialization status with isInitialized()",
      );
    }

    const results = this.fuse.search(wrongPath, { limit: 1 });

    if (results.length > 0) {
      const bestMatch = results[0];
      if (bestMatch.score !== undefined && bestMatch.score <= 1 - threshold) {
        return bestMatch.item;
      }
    }

    return null;
  }

  /**
   * Validates whether the provided file path exists.
   */
  public validatePath(filePath: string): boolean {
    try {
      return fs.pathExistsSync(filePath) && fs.lstatSync(filePath).isFile();
    } catch (error) {
      console.error("Error validating path:", error);
      return false;
    }
  }

  /**
   * Adjusts the wrong path by finding and validating the closest match.
   */
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

  /**
   * Converts an absolute path to a relative path based on the base directory.
   * If the path is already relative and valid, it will be returned as-is.
   */
  public toRelativePath(absolutePath: string): string {
    // If the path is already relative and exists relative to base directory, return it
    if (!path.isAbsolute(absolutePath)) {
      const possiblePath = path.join(this.baseDirectory, absolutePath);
      if (this.validatePath(possiblePath)) {
        return absolutePath;
      }
    }

    // Ensure the path is absolute
    const normalizedPath = path.resolve(absolutePath);

    // Check if the path is within the base directory
    if (!normalizedPath.startsWith(this.baseDirectory)) {
      throw new Error("Path is outside the base directory");
    }

    // Convert to relative path from base directory
    return path.relative(this.baseDirectory, normalizedPath);
  }

  /**
   * Refreshes the file paths by reloading all files from the base directory.
   * Useful if the file system has changed since initialization.
   */
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
