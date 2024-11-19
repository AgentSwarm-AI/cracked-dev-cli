import { autoInjectable } from "tsyringe";
import { FileOperations } from "../../FileManagement/FileOperations";
import { IEditOperation } from "../../FileManagement/types/FileManagementTypes";
import { ActionTagsExtractor } from "./ActionTagsExtractor";
import { IActionResult } from "./types/ActionTypes";

interface IFileEdit {
  path: string;
  operations: IEditOperation[];
}

@autoInjectable()
export class EditFileAction {
  constructor(
    private fileOperations: FileOperations,
    private actionTagsExtractor: ActionTagsExtractor,
  ) {}

  private unescapeNewlines(content: string): string {
    return content.replace(/\\n/g, "\n");
  }

  private extractOperations(content: string): IEditOperation[] {
    const operations: IEditOperation[] = [];

    // Extract replace operations
    const replaces = this.actionTagsExtractor.extractAllTagsWithContent(
      content,
      "replace",
    );
    for (const replace of replaces) {
      const pattern = this.actionTagsExtractor.extractTag(replace, "pattern");
      let content = this.actionTagsExtractor.extractTag(replace, "content");

      if (!pattern || !content) {
        throw new Error(
          "Invalid replace format. Must include pattern and content.",
        );
      }

      content = this.unescapeNewlines(content);

      operations.push({
        type: "replace",
        pattern,
        content,
      });
    }

    // Extract insert_before operations
    const insertBefores = this.actionTagsExtractor.extractAllTagsWithContent(
      content,
      "insert_before",
    );
    for (const insert of insertBefores) {
      const pattern = this.actionTagsExtractor.extractTag(insert, "pattern");
      let content = this.actionTagsExtractor.extractTag(insert, "content");

      if (!pattern || !content) {
        throw new Error(
          "Invalid insert_before format. Must include pattern and content.",
        );
      }

      content = this.unescapeNewlines(content);

      operations.push({
        type: "insert_before",
        pattern,
        content,
      });
    }

    // Extract insert_after operations
    const insertAfters = this.actionTagsExtractor.extractAllTagsWithContent(
      content,
      "insert_after",
    );
    for (const insert of insertAfters) {
      const pattern = this.actionTagsExtractor.extractTag(insert, "pattern");
      let content = this.actionTagsExtractor.extractTag(insert, "content");

      if (!pattern || !content) {
        throw new Error(
          "Invalid insert_after format. Must include pattern and content.",
        );
      }

      content = this.unescapeNewlines(content);

      operations.push({
        type: "insert_after",
        pattern,
        content,
      });
    }

    // Extract delete operations
    const deletes = this.actionTagsExtractor.extractAllTagsWithContent(
      content,
      "delete",
    );
    for (const del of deletes) {
      const pattern = this.actionTagsExtractor.extractTag(del, "pattern");

      if (!pattern) {
        throw new Error("Invalid delete format. Must include pattern.");
      }

      operations.push({
        type: "delete",
        pattern,
      });
    }

    return operations;
  }

  private extractFileEdits(content: string): IFileEdit[] {
    const fileEdits: IFileEdit[] = [];
    const changesContent = this.actionTagsExtractor.extractTag(
      content,
      "changes",
    );

    if (!changesContent) {
      throw new Error("Invalid edit_file format. Must include <changes> tag.");
    }

    // Try to extract multiple file tags
    const files = this.actionTagsExtractor.extractAllTagsWithContent(
      changesContent,
      "file",
    );

    // If no file tags found, treat as legacy single-file format
    if (files.length === 0) {
      const path = this.actionTagsExtractor.extractTag(content, "path");
      if (!path) {
        throw new Error("Invalid edit_file format. Must include <path> tag.");
      }

      const operations = this.extractOperations(changesContent);
      if (operations.length === 0) {
        throw new Error("No valid operations found in changes.");
      }

      fileEdits.push({ path, operations });
      return fileEdits;
    }

    // Process multiple file tags
    for (const file of files) {
      const path = this.actionTagsExtractor.extractTag(file, "path");
      if (!path) {
        throw new Error("Invalid file tag format. Must include path.");
      }

      const operations = this.extractOperations(file);
      if (operations.length === 0) {
        throw new Error(`No valid operations found for file: ${path}`);
      }

      fileEdits.push({ path, operations });
    }

    return fileEdits;
  }

  async execute(content: string): Promise<IActionResult> {
    try {
      // Extract validation command if present
      const validateCommand = this.actionTagsExtractor.extractTag(
        content,
        "validate",
      );

      // Extract file edits
      const fileEdits = this.extractFileEdits(content);

      // Process each file edit
      for (const { path, operations } of fileEdits) {
        console.log(`📝 Editing file: ${path}`);
        console.log(`Operations to perform: ${operations.length}`);

        const result = await this.fileOperations.edit(path, operations);
        if (!result.success) {
          return result;
        }
      }

      // Execute validation command if present
      if (validateCommand) {
        console.log("Running validation command:", validateCommand);
        // Note: Validation command execution would be handled by CommandAction
        // This is left as a placeholder for integration with command execution
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error : new Error("Failed to edit file"),
      };
    }
  }
}
