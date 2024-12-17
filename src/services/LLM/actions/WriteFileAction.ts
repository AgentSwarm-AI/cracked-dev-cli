import { BLOCK_WRITE_IF_CONTENT_REMOVAL_THRESHOLD } from "@constants/writeConstants";
import { FileOperations } from "@services/FileManagement/FileOperations";
import { ModelScaler } from "@services/LLM/ModelScaler";
import { HtmlEntityDecoder } from "@services/text/HTMLEntityDecoder";
import path from "path";
import { autoInjectable } from "tsyringe";
import { ActionTagsExtractor } from "./ActionTagsExtractor";
import { writeFileActionBlueprint as blueprint } from "./blueprints/writeFileActionBlueprint";
import { BaseAction } from "./core/BaseAction";
import { IActionBlueprint } from "./core/IAction";
import { IActionResult } from "./types/ActionTypes";

interface WriteFileParams {
  path: string;
  content: string;
}

const MAX_CONTENT_SIZE_MB = 10;
const MAX_CONTENT_SIZE_BYTES = MAX_CONTENT_SIZE_MB * 1024 * 1024;
const MAX_LINE_LENGTH = 10000;

@autoInjectable()
export class WriteFileAction extends BaseAction {
  constructor(
    protected actionTagsExtractor: ActionTagsExtractor,
    private fileOperations: FileOperations,
    private htmlEntityDecoder: HtmlEntityDecoder,
    private modelScaler: ModelScaler,
  ) {
    super(actionTagsExtractor);
  }

  protected logWarning(message: string): void {
    console.warn(`⚠️ write_file: ${message}`);
  }

  protected logError(message: string): void {
    console.error(`❌ write_file: ${message}`);
  }

  protected logInfo(message: string): void {
    console.info(`ℹ️ write_file: ${message}`);
  }

  protected getBlueprint(): IActionBlueprint {
    return blueprint;
  }

  protected validateParams(params: Record<string, any>): string | null {
    try {
      const { path: filePath, content } = params as WriteFileParams;

      if (!filePath) {
        return "No file path provided";
      }
      if (!content) {
        return "No file content provided";
      }

      // Validate path
      if (filePath.includes("..")) {
        return "Path traversal is not allowed";
      }

      // Validate content size
      const contentSizeBytes = Buffer.byteLength(content, "utf8");
      if (contentSizeBytes > MAX_CONTENT_SIZE_BYTES) {
        return `Content size (${(contentSizeBytes / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${MAX_CONTENT_SIZE_MB}MB)`;
      }

      return null;
    } catch (error) {
      this.logError(`Error in validateParams: ${error}`);
      return `Validation error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  protected extractParamValue(
    content: string,
    paramName: string,
  ): string | string[] | null {
    try {
      // Handle content parameter specially to preserve nested tags
      if (paramName === "content") {
        const contentMatch = content.match(/<content>([\s\S]*?)<\/content>/);
        if (!contentMatch) {
          this.logWarning(
            `Failed to extract content parameter from: ${content.substring(0, 100)}...`,
          );
          return null;
        }
        return contentMatch[1].trim();
      }

      // Use default extraction for other parameters
      const value = super.extractParamValue(content, paramName);
      return Array.isArray(value) ? value[0] : value;
    } catch (error) {
      this.logError(`Error extracting parameter ${paramName}: ${error}`);
      return null;
    }
  }

  protected async executeInternal(
    params: Record<string, any>,
  ): Promise<IActionResult> {
    try {
      const { path: rawFilePath, content: fileContent } =
        params as WriteFileParams;

      // Normalize path
      const filePath = path.normalize(rawFilePath).replace(/\\/g, "/");
      this.logInfo(`Writing to file: ${filePath}`);

      // Check for large content removal if file exists
      const removalCheck = await this.checkLargeRemoval(filePath, fileContent);
      if (!removalCheck.success) {
        return removalCheck;
      }

      // Decode and validate content
      const decodedContent = this.htmlEntityDecoder.decode(fileContent, {
        unescapeChars: ['"'],
      });
      if (!this.isValidContent(decodedContent)) {
        return this.createErrorResult(
          "Invalid content detected after decoding",
        );
      }

      // Write file
      const result = await this.fileOperations.write(filePath, decodedContent);

      if (!result.success) {
        this.logError(`Failed to write file ${filePath}: ${result.error}`);
        return this.createErrorResult(result.error!);
      }

      this.logInfo(
        `Successfully wrote ${Buffer.byteLength(decodedContent, "utf8")} bytes to ${filePath}`,
      );
      return this.createSuccessResult();
    } catch (error) {
      this.logError(`Unexpected error in WriteFileAction: ${error}`);
      return this.createErrorResult(
        `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async checkLargeRemoval(
    filePath: string,
    newContent: string,
  ): Promise<IActionResult> {
    try {
      const exists = await this.fileOperations.exists(filePath);
      if (!exists) {
        this.logInfo(`Creating new file: ${filePath}`);
        return this.createSuccessResult();
      }

      this.logInfo(`File exists at: ${filePath}`);
      this.modelScaler.incrementTryCount(filePath);

      const readResult = await this.fileOperations.read(filePath);
      if (!readResult.success) {
        this.logWarning(
          `Could not read existing file ${filePath}: ${readResult.error}`,
        );
        return this.createSuccessResult();
      }

      const existingContent = readResult.data as string;
      const removalPercentage = this.calculateRemovalPercentage(
        existingContent,
        newContent,
      );

      this.logInfo(
        `Content removal percentage: ${removalPercentage.toFixed(1)}%`,
      );

      if (removalPercentage > BLOCK_WRITE_IF_CONTENT_REMOVAL_THRESHOLD) {
        return this.createErrorResult(
          `Prevented removal of ${removalPercentage.toFixed(1)}% of file content. This appears to be a potential error. Please review the changes and ensure only necessary modifications are made.`,
        );
      }

      return this.createSuccessResult();
    } catch (error) {
      this.logError(`Error in checkLargeRemoval: ${error}`);
      return this.createErrorResult(
        `Error checking content removal: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private calculateRemovalPercentage(
    existingContent: string,
    newContent: string,
  ): number {
    const existingLength = existingContent.trim().length;
    const newLength = newContent.trim().length;

    if (existingLength === 0) return 0;

    const removedLength = Math.max(0, existingLength - newLength);
    return (removedLength / existingLength) * 100;
  }

  private isValidContent(content: string): boolean {
    try {
      // Check for null bytes and other potentially dangerous content
      if (content.includes("\0")) {
        this.logWarning("Content contains null bytes");
        return false;
      }

      // Check for reasonable line length
      const hasExcessiveLines = content
        .split("\n")
        .some((line) => line.length > MAX_LINE_LENGTH);
      if (hasExcessiveLines) {
        this.logWarning("Content contains excessively long lines");
        return false;
      }

      return true;
    } catch (error) {
      this.logError(`Error in isValidContent: ${error}`);
      return false;
    }
  }
}
