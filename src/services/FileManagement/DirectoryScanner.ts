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
  private readonly configService: ConfigService;

  private readonly REQUIRED_IGNORE: string[];
  private readonly DEFAULT_IGNORE: string[];
  private readonly DEFAULT_OPTIONS: TreeOptions;

  constructor(@inject(ConfigService) configService: ConfigService) {
    this.configService = configService;

    const config = this.configService.getConfig().directoryScanner;
    this.REQUIRED_IGNORE = config?.requiredIgnore || ["node_modules", ".git"];
    this.DEFAULT_IGNORE = config?.defaultIgnore || [
      "dist",
      "coverage",
      ".next",
      "build",
      ".cache",
      ".husky",
    ];
    this.DEFAULT_OPTIONS = {
      ignore: this.REQUIRED_IGNORE,
      allFiles: config?.allFiles !== undefined ? config.allFiles : true,
      maxDepth: config?.maxDepth !== undefined ? config.maxDepth : 8,
      noreport: config?.noreport !== undefined ? config.noreport : true,
      base: config?.base || ".",
      directoryFirst:
        config?.directoryFirst !== undefined ? config.directoryFirst : true,
      excludeDirectories:
        config?.excludeDirectories !== undefined
          ? config.excludeDirectories
          : false,
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
