import {
  IDirectoryScanner,
  TreeOptions,
} from "@services/FileManagement/types/DirectoryScannerTypes";
import { IFileOperationResult } from "@services/FileManagement/types/FileManagementTypes";
import fs from "fs";
import path from "path";
import { autoInjectable } from "tsyringe";

@autoInjectable()
export class DirectoryScanner implements IDirectoryScanner {
  private readonly REQUIRED_IGNORE = ["node_modules", ".git"];

  private readonly DEFAULT_IGNORE = [
    "dist",
    "coverage",
    ".next",
    "build",
    ".cache",
    ".husky",
  ];

  private readonly DEFAULT_OPTIONS: TreeOptions = {
    ignore: this.DEFAULT_IGNORE,
    allFiles: true,
    maxDepth: 8,
    noreport: true,
    base: ".",
    directoryFirst: true,
    excludeDirectories: false,
  };

  private getAllFiles(
    dirPath: string,
    basePath: string,
    arrayOfFiles: string[] = [],
    ignore: string[] = [],
    currentDepth: number = 0,
    maxDepth: number = 4,
  ): string[] {
    if (currentDepth > maxDepth) return arrayOfFiles;

    const files = fs.readdirSync(dirPath);

    files.forEach((file) => {
      if (ignore.includes(file)) return;

      const fullPath = path.join(dirPath, file);
      const relativePath = path.relative(basePath, fullPath);

      if (fs.statSync(fullPath).isDirectory()) {
        this.getAllFiles(
          fullPath,
          basePath,
          arrayOfFiles,
          ignore,
          currentDepth + 1,
          maxDepth,
        );
      } else {
        arrayOfFiles.push(relativePath);
      }
    });

    return arrayOfFiles;
  }

  public async scan(
    dirPath: string,
    options?: Partial<TreeOptions>,
  ): Promise<IFileOperationResult> {
    try {
      const scanOptions = { ...this.DEFAULT_OPTIONS, ...options };
      // Only combine required ignores with user provided ignores if they exist
      // otherwise use required + default ignores
      const ignore = [
        ...this.REQUIRED_IGNORE,
        ...(options?.ignore || this.DEFAULT_IGNORE),
      ];
      const absolutePath = path.resolve(dirPath);

      const files = this.getAllFiles(
        absolutePath,
        absolutePath,
        [],
        ignore,
        0,
        scanOptions.maxDepth,
      ).sort();

      return {
        success: true,
        data: files.map((f) => f.trim()).join("\n"),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}
