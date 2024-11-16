import treeCliDefault from "tree-cli";
import { autoInjectable } from "tsyringe";
import { IDirectoryScanner, TreeOptions } from "./types/DirectoryScannerTypes";
import { IFileOperationResult } from "./types/FileManagementTypes";

@autoInjectable()
export class DirectoryScanner implements IDirectoryScanner {
  private readonly DEFAULT_IGNORE = [
    "node_modules",
    ".git",
    "dist",
    "coverage",
    ".next",
    "build",
    ".cache",
  ];

  private readonly DEFAULT_OPTIONS: TreeOptions = {
    ignore: this.DEFAULT_IGNORE,
    allFiles: true,
    maxDepth: 4,
    noreport: true,
    base: ".",
  };

  /**
   * Scans a directory and returns a tree structure
   * @param path - Directory path to scan
   * @param options - Optional tree-cli options
   */
  public async scan(
    path: string,
    options?: Partial<TreeOptions>,
  ): Promise<IFileOperationResult> {
    try {
      const scanOptions: TreeOptions = {
        ...this.DEFAULT_OPTIONS,
        ...options,
        base: path,
      };

      // Merge ignore patterns if provided in options
      if (options?.ignore) {
        scanOptions.ignore = [...this.DEFAULT_IGNORE, ...options.ignore];
      }

      const result = await treeCliDefault(scanOptions);
      return {
        success: true,
        data: JSON.stringify(result, null, 2),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Scans a directory and returns a simplified tree structure
   * Optimized for token efficiency by limiting depth and excluding unnecessary info
   */
  public async scanLight(path: string): Promise<IFileOperationResult> {
    const options: TreeOptions = {
      ...this.DEFAULT_OPTIONS,
      base: path,
      maxDepth: 3,
      noreport: true,
      directoryFirst: true,
    };

    return this.scan(path, options);
  }
}
