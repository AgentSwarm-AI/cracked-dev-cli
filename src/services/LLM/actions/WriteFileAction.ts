import { autoInjectable } from "tsyringe";
import { FileOperations } from "../../FileManagement/FileOperations";
import { IFileOperationResult } from "../../FileManagement/types/FileManagementTypes";
import { HtmlEntityDecoder } from "../../text/HTMLEntityDecoder";
import { ActionTagsExtractor } from "./ActionTagsExtractor";
import { IActionResult } from "./types/ActionTypes";

@autoInjectable()
export class WriteFileAction {
  constructor(
    private fileOperations: FileOperations,
    private actionTagsExtractor: ActionTagsExtractor,
    private htmlEntityDecoder: HtmlEntityDecoder,
  ) {}

  async execute(content: string): Promise<IActionResult> {
    const filePath = this.actionTagsExtractor.extractTag(content, "path");
    const fileContent = this.actionTagsExtractor.extractTag(content, "content");

    if (!filePath || !fileContent) {
      return {
        success: false,
        error: new Error(
          "Invalid write_file format. Must include both <path> and <content> tags.",
        ),
      };
    }

    console.log(`📁 File path: ${filePath}`);
    const result = await this.fileOperations.write(
      filePath,
      this.htmlEntityDecoder.decode(fileContent),
    );
    return this.convertFileResult(result);
  }

  private convertFileResult(result: IFileOperationResult): IActionResult {
    if (result.success) {
      console.log("✅ Action completed successfully. Please wait...\n\n");
    } else {
      console.log("❌ Action failed");
    }

    console.log("-".repeat(50));

    return {
      success: result.success,
      data: result.data,
      error: result.error,
    };
  }
}
