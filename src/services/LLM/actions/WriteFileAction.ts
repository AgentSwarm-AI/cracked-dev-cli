import { BLOCK_WRITE_IF_CONTENT_REMOVAL_THRESHOLD } from "@constants/writeConstants";
import { FileOperations } from "@services/FileManagement/FileOperations";
import { ActionTagsExtractor } from "@services/LLM/actions/ActionTagsExtractor";
import { IActionResult } from "@services/LLM/actions/types/ActionTypes";
import { ModelScaler } from "@services/LLM/ModelScaler";
import { HtmlEntityDecoder } from "@services/text/HTMLEntityDecoder";
import { autoInjectable } from "tsyringe";

@autoInjectable()
export class WriteFileAction {
  constructor(
    private fileOperations: FileOperations,
    private actionTagsExtractor: ActionTagsExtractor,
    private htmlEntityDecoder: HtmlEntityDecoder,
    private modelScaler: ModelScaler,
  ) {}

  async execute(content: string): Promise<IActionResult> {
    const filePath = this.actionTagsExtractor.extractTag(content, "path");
    const fileContent = this.actionTagsExtractor.extractTag(content, "content");
    const tryCount = this.actionTagsExtractor.extractTag(content, "try");

    if (!filePath || !fileContent) {
      if (!filePath) {
        console.log("🚫 No file path provided");
      }
      if (!fileContent) {
        console.log("🚫 No file content provided");
      }

      return {
        success: false,
        error: new Error(
          "Invalid write_file format. Must include both <path> and <content> tags.",
        ),
      };
    }

    console.log(`📁 File path: ${filePath}`);

    // Update model scaler with try count if provided
    if (tryCount) {
      const count = parseInt(tryCount, 10);
      console.log(`🔄 Try count: ${count}`);
      this.modelScaler.setTryCount(filePath, count);
    }

    // Check for large content removal if file exists
    const removalCheck = await this.checkLargeRemoval(filePath, fileContent);
    if (!removalCheck.success) {
      return removalCheck;
    }

    const result = await this.fileOperations.write(
      filePath,
      this.htmlEntityDecoder.decode(fileContent),
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      data: {
        selectedModel: this.modelScaler.getCurrentModel(),
      },
    };
  }

  private async checkLargeRemoval(
    filePath: string,
    newContent: string,
  ): Promise<IActionResult> {
    const exists = await this.fileOperations.exists(filePath);
    if (!exists) {
      return { success: true }; // New file, no removal check needed
    }

    const readResult = await this.fileOperations.read(filePath);
    if (!readResult.success) {
      return { success: true }; // Can't read existing file, proceed with write
    }

    const existingContent = readResult.data as string;
    const removalPercentage = this.calculateRemovalPercentage(
      existingContent,
      newContent,
    );

    if (removalPercentage > BLOCK_WRITE_IF_CONTENT_REMOVAL_THRESHOLD) {
      return {
        success: false,
        error: new Error(
          `Prevented removal of ${removalPercentage.toFixed(1)}% of file content. This appears to be a potential error. Please review the changes and ensure only necessary modifications are made.`,
        ),
      };
    }

    return { success: true };
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
