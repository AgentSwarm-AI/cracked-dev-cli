import { BLOCK_WRITE_IF_CONTENT_REMOVAL_THRESHOLD } from "@constants/writeConstants";
import { FileOperations } from "@services/FileManagement/FileOperations";
import { ModelScaler } from "@services/LLM/ModelScaler";
import { HtmlEntityDecoder } from "@services/text/HTMLEntityDecoder";
import { autoInjectable } from "tsyringe";
import { ActionTagsExtractor } from "./ActionTagsExtractor";
import { writeFileAction as blueprint } from "./blueprints/writeFileAction";
import { BaseAction } from "./core/BaseAction";
import { IActionMetadata } from "./core/IAction";
import { IActionResult } from "./types/ActionTypes";

interface WriteFileParams {
  path: string;
  content: string;
}

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

  protected getBlueprint(): IActionMetadata {
    return blueprint;
  }

  protected validateParams(params: Record<string, any>): string | null {
    const { path, content } = params as WriteFileParams;

    if (!path) {
      return "No file path provided";
    }
    if (!content) {
      return "No file content provided";
    }
    return null;
  }

  protected extractParamValue(
    content: string,
    paramName: string,
  ): string | string[] | null {
    // Handle content parameter specially to preserve nested tags
    if (paramName === "content") {
      const contentMatch = content.match(/<content>([\s\S]*?)<\/content>/);
      return contentMatch ? contentMatch[1].trim() : null;
    }

    // Use default extraction for other parameters
    const value = super.extractParamValue(content, paramName);
    return Array.isArray(value) ? value[0] : value;
  }

  protected async executeInternal(
    params: Record<string, any>,
  ): Promise<IActionResult> {
    const { path: filePath, content: fileContent } = params as WriteFileParams;

    this.logInfo(`File path: ${filePath}`);

    // Check if file exists and increment try count if it does
    const exists = await this.fileOperations.exists(filePath);
    if (exists) {
      this.modelScaler.incrementTryCount(filePath);
    }

    // Check for large content removal if file exists
    const removalCheck = await this.checkLargeRemoval(filePath, fileContent);
    if (!removalCheck.success) {
      return removalCheck;
    }

    // Write file
    const result = await this.fileOperations.write(
      filePath,
      this.htmlEntityDecoder.decode(fileContent),
    );

    if (!result.success) {
      return this.createErrorResult(result.error!);
    }

    return this.createSuccessResult({
      selectedModel: this.modelScaler.getCurrentModel(),
    });
  }

  private async checkLargeRemoval(
    filePath: string,
    newContent: string,
  ): Promise<IActionResult> {
    const exists = await this.fileOperations.exists(filePath);
    if (!exists) {
      return this.createSuccessResult(); // New file, no removal check needed
    }

    const readResult = await this.fileOperations.read(filePath);
    if (!readResult.success) {
      return this.createSuccessResult(); // Can't read existing file, proceed with write
    }

    const existingContent = readResult.data as string;
    const removalPercentage = this.calculateRemovalPercentage(
      existingContent,
      newContent,
    );

    if (removalPercentage > BLOCK_WRITE_IF_CONTENT_REMOVAL_THRESHOLD) {
      return this.createErrorResult(
        `Prevented removal of ${removalPercentage.toFixed(1)}% of file content. This appears to be a potential error. Please review the changes and ensure only necessary modifications are made.`,
      );
    }

    return this.createSuccessResult();
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
}
