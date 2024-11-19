import fs from "fs-extra";
import path from "path";
import { autoInjectable } from "tsyringe";
import {
  IEditOperation,
  IFileOperationResult,
  IFileOperations,
  IFileStats,
} from "./types/FileManagementTypes";

@autoInjectable()
export class FileOperations implements IFileOperations {
  async read(filePath: string): Promise<IFileOperationResult> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      return { success: true, data: content };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  async readMultiple(filePaths: string[]): Promise<IFileOperationResult> {
    try {
      if (!filePaths?.length) {
        return { success: false, error: new Error("No files provided") };
      }

      const fileContents: string[] = [];
      const errors: string[] = [];

      for (const filePath of filePaths) {
        try {
          const content = await fs.readFile(filePath, "utf-8");
          if (content) {
            fileContents.push(`[File: ${filePath}]\\n${content}`);
          } else {
            errors.push(`${filePath}: Empty content`);
          }
        } catch (error) {
          errors.push(`${filePath}: ${(error as Error).message}`);
        }
      }

      if (errors.length > 0) {
        return {
          success: false,
          error: new Error(
            `Failed to read files: ${errors.join(", ")}  - Try using a <search_file> to find the correct file path.`,
          ),
        };
      }

      if (fileContents.length !== filePaths.length) {
        return {
          success: false,
          error: new Error(
            "Some files were not read successfully. Try using search_file action to find the proper path.",
          ),
        };
      }

      return { success: true, data: fileContents.join("\\n\\n") };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  async write(
    filePath: string,
    content: string | Buffer,
  ): Promise<IFileOperationResult> {
    try {
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, content);
      return { success: true };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  async delete(filePath: string): Promise<IFileOperationResult> {
    try {
      if (!(await fs.pathExists(filePath))) {
        return {
          success: false,
          error: new Error(`File does not exist: ${filePath}`),
        };
      }
      await fs.remove(filePath);
      return { success: true };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  async copy(
    source: string,
    destination: string,
  ): Promise<IFileOperationResult> {
    try {
      await fs.ensureDir(path.dirname(destination));
      await fs.copy(source, destination);
      return { success: true };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  async move(
    source: string,
    destination: string,
  ): Promise<IFileOperationResult> {
    try {
      await fs.ensureDir(path.dirname(destination));
      await fs.move(source, destination, { overwrite: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  async exists(filePath: string): Promise<boolean> {
    return fs.pathExists(filePath);
  }

  async stats(filePath: string): Promise<IFileOperationResult> {
    try {
      const stats = await fs.stat(filePath);
      const fileStats: IFileStats = {
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        isDirectory: stats.isDirectory(),
        path: filePath,
      };
      return { success: true, data: fileStats };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  async edit(
    filePath: string,
    operations: IEditOperation[],
  ): Promise<IFileOperationResult> {
    try {
      let content = await fs.readFile(filePath, "utf-8");

      for (const op of operations) {
        if (!op.pattern) {
          return {
            success: false,
            error: new Error("Empty pattern not allowed"),
          };
        }

        const regex = new RegExp(op.pattern, "g");

        switch (op.type) {
          case "replace": {
            content = content.replace(regex, op.content || "");
            break;
          }
          case "insert_before": {
            content = content.replace(regex, `${op.content || ""}$&`);
            break;
          }
          case "insert_after": {
            content = content.replace(regex, `$&${op.content || ""}`);
            break;
          }
          case "delete": {
            content = content.replace(regex, "");
            break;
          }
        }
        // Normalize spaces after each operation
        content = content.replace(/\s+/g, " ").trim();
      }

      await fs.writeFile(filePath, content);
      return { success: true };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }
}
