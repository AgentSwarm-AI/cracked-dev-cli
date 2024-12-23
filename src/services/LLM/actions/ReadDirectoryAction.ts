// src/services/LLM/actions/ReadDirectoryAction.ts
import { DirectoryScanner } from "@services/FileManagement/DirectoryScanner";
import { FileReader } from "@services/FileManagement/FileReader";
import { autoInjectable } from "tsyringe";
import { ActionTagsExtractor } from "./ActionTagsExtractor";
import { readDirectoryActionBlueprint } from "./blueprints/readDirectoryActionBlueprint";
import { BaseAction } from "./core/BaseAction";
import { IActionBlueprint } from "./core/IAction";
import { IActionResult } from "./types/ActionTypes";

interface ReadDirectoryParams {
  directory: string;
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

  protected parseParams(content: string): Record<string, any> {
    const tag = this.getBlueprint().tag;
    const match = content.match(new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`));
    if (!match) {
      this.logError("Failed to parse directory content");
      return { directory: "" };
    }

    const tagContent = match[0];
    const directory = this.actionTagsExtractor.extractTag(
      tagContent,
      "directory",
    );

    const getValue = (value: string | string[] | null): string => {
      if (!value) return "";
      return Array.isArray(value) ? value[0]?.trim() || "" : value.trim();
    };

    return {
      directory: getValue(directory),
    };
  }

  protected validateParams(params: Record<string, any>): string | null {
    const { directory } = params as ReadDirectoryParams;

    if (!directory) {
      return "No directory provided";
    }

    return null;
  }

  protected async executeInternal(
    params: Record<string, any>,
  ): Promise<IActionResult> {
    try {
      const { directory } = params as ReadDirectoryParams;

      this.logInfo(`Reading directory: ${directory}`);

      // Scan directory for files
      const scanResult = await this.directoryScanner.scan(directory);
      if (!scanResult.success || !scanResult.data) {
        throw new Error(
          `Failed to scan directory: ${scanResult.error?.message}`,
        );
      }

      // Get array of file paths
      if (typeof scanResult.data !== "string") {
        throw new Error("scanResult.data is not a string");
      }
      const filePaths = scanResult.data.split("\n").filter(Boolean);

      // Read content of each file
      const fileContents: FileContent[] = [];
      for (const filePath of filePaths) {
        try {
          const readResult = await this.fileReader.readFile(filePath);
          if (readResult.success && readResult.data) {
            fileContents.push({
              path: filePath,
              content: readResult.data,
            });
          }
        } catch (error) {
          this.logError(`Failed to read file ${filePath}: ${error}`);
          // Continue with other files even if one fails
        }
      }

      if (fileContents.length === 0) {
        this.logInfo("No files read successfully");
        return this.createSuccessResult([]);
      }

      this.logSuccess(`Successfully read ${fileContents.length} files`);
      return this.createSuccessResult(fileContents);
    } catch (error) {
      this.logError(`Directory read failed: ${(error as Error).message}`);
      return this.createErrorResult(error as Error);
    }
  }
}
