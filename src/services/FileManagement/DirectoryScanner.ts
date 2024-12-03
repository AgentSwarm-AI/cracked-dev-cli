import { ConfigService } from "@services/ConfigService";
import {
  IDirectoryScanner,
  TreeOptions,
} from "@services/FileManagement/types/DirectoryScannerTypes";
import { IFileOperationResult } from "@services/FileManagement/types/FileManagementTypes";
import fs from "fs";
import path from "path";
import { autoInjectable, inject } from "tsyringe";

@autoInjectable()
export class DirectoryScanner implements IDirectoryScanner {
  private readonly REQUIRED_IGNORE = ["node_modules", ".git"];

  constructor(@inject(ConfigService) private configService: ConfigService) {
    if (!configService) {
      throw new Error("ConfigService is required for DirectoryScanner");
    }
  }

  private get DEFAULT_OPTIONS(): TreeOptions {
    const config = this.configService.getConfig();
    return {
      ignore: config.directoryScanner.defaultIgnore,
      allFiles: config.directoryScanner.allFiles,
      maxDepth: config.directoryScanner.maxDepth,
      noreport: true,
      base: ".",
      directoryFirst: config.directoryScanner.directoryFirst,
      excludeDirectories: config.directoryScanner.excludeDirectories,
    };
  }

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
    options: Partial<TreeOptions> = {},
  ): Promise<IFileOperationResult> {
    try {
      const defaultOptions = this.DEFAULT_OPTIONS;
      const scanOptions = { ...defaultOptions, ...options };
      const ignore = [
        ...this.REQUIRED_IGNORE,
        ...(options.ignore || defaultOptions.ignore),
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
