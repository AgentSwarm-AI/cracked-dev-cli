// src/services/LLM/actions/ReadDirectoryAction.ts
import { DirectoryScanner } from "@services/FileManagement/DirectoryScanner";
import { FileReader } from "@services/FileManagement/FileReader";
import path from "path";
import { autoInjectable } from "tsyringe";
import { ActionTagsExtractor } from "./ActionTagsExtractor";
import { readDirectoryActionBlueprint } from "./blueprints/readDirectoryActionBlueprint";
import { BaseAction } from "./core/BaseAction";
import { IActionBlueprint } from "./core/IAction";
import { IActionResult } from "./types/ActionTypes";

interface ReadDirectoryParams {
  path: string[];
}

interface FileContent {
  path: string;
  content: string;
}

@autoInjectable()
export class ReadDirectoryAction extends BaseAction {
  constructor(
    protected actionTagsExtractor: ActionTagsExtractor,
    private directoryScanner: DirectoryScanner,
    private fileReader: FileReader,
  ) {
    super(actionTagsExtractor);
  }

  protected getBlueprint(): IActionBlueprint {
    return readDirectoryActionBlueprint;
  }

  protected extractParamValue(
    content: string,
    paramName: string,
  ): string | string[] | null {
    if (paramName === "path") {
      // Extract all path tags
      const regex = new RegExp(`<${paramName}>(.*?)</${paramName}>`, "g");
      const matches = Array.from(content.matchAll(regex));
      const paths = matches.map((match) => match[1].trim());
      return paths.length > 0 ? paths : null;
    }

    // Use default extraction for other parameters
    return super.extractParamValue(content, paramName);
  }

  protected validateParams(params: Record<string, any>): string | null {
    const paths = (params as ReadDirectoryParams).path;

    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return "Must include at least one <path> tag";
    }

    const invalidPaths = paths.filter((path) => !path);
    if (invalidPaths.length > 0) {
      return `Invalid paths found: ${invalidPaths.join(", ")}`;
    }

    return null;
  }

  protected async executeInternal(
    params: Record<string, any>,
  ): Promise<IActionResult> {
    try {
      const { path: directories } = params as ReadDirectoryParams;
      const allFileContents: FileContent[] = [];
      const errors: string[] = [];

      for (const directory of directories) {
        this.logInfo(`Reading directory: ${directory}`);
        console.log("-".repeat(80));

        // Scan directory for files
        const scanResult = await this.directoryScanner.scan(directory);
        if (!scanResult.success || !scanResult.data) {
          const errorMsg = `Failed to scan directory ${directory}: ${scanResult.error?.message}`;
          this.logError(errorMsg);
          errors.push(errorMsg);
          continue;
        }

        // Get array of file paths
        if (typeof scanResult.data !== "string") {
          const errorMsg = `Invalid scan result for directory ${directory}`;
          this.logError(errorMsg);
          errors.push(errorMsg);
          continue;
        }

        const filePaths = scanResult.data
          .split("\n")
          .filter(Boolean)
          .map((p) => path.resolve(directory, p));

        this.logInfo(`Found ${filePaths.length} files in ${directory}:`);
        filePaths.forEach((p) =>
          this.logInfo(`  - ${path.relative(process.cwd(), p)}`),
        );
        console.log("-".repeat(80));

        // Read content of each file
        for (const filePath of filePaths) {
          try {
            const readResult = await this.fileReader.readFile(filePath);
            if (readResult.success && readResult.data) {
              allFileContents.push({
                path: filePath,
                content: readResult.data,
              });
            } else {
              const errorMsg = `Failed to read file ${path.relative(process.cwd(), filePath)}: ${readResult.error?.message}`;
              this.logError(errorMsg);
              errors.push(errorMsg);
            }
          } catch (error) {
            const errorMsg = `Error reading file ${path.relative(process.cwd(), filePath)}: ${error}`;
            this.logError(errorMsg);
            errors.push(errorMsg);
          }
        }
      }

      // If no files were read successfully and we have errors, return error result
      if (allFileContents.length === 0 && errors.length > 0) {
        return this.createErrorResult(new Error(errors.join("\n")));
      }

      if (allFileContents.length === 0) {
        this.logInfo("No files read successfully");
        return this.createSuccessResult([]);
      }

      console.log("-".repeat(80));
      this.logSuccess(
        `Successfully read ${allFileContents.length} files from ${directories.length} directories:`,
      );
      allFileContents.forEach((f) =>
        this.logInfo(`  - ${path.relative(process.cwd(), f.path)}`),
      );
      console.log("-".repeat(80));

      return this.createSuccessResult(allFileContents);
    } catch (error) {
      this.logError(`Directory read failed: ${(error as Error).message}`);
      return this.createErrorResult(error as Error);
    }
  }
}
