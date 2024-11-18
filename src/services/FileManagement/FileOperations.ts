import fs from "fs-extra";
import path from "path";
import { autoInjectable } from "tsyringe";
import {
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

      console.log("Attempting to read files:", filePaths);
      const results = await Promise.all(
        filePaths.map(async (filePath) => {
          try {
            const content = await fs.readFile(filePath, "utf-8");
            if (!content) {
              return {
                path: filePath,
                content: "",
                success: false,
              } as const;
            }
            return { path: filePath, content, success: true } as const;
          } catch (error) {
            return {
              path: filePath,
              error: error as Error,
              success: false,
            } as const;
          }
        }),
      );

      // Check if any reads failed
      const failures = results.filter((r) => !r.success);
      if (failures.length > 0) {
        const errors = failures
          .map((f) => `${f.path}: ${f.error?.message}`)
          .join(", ");
        return {
          success: false,
          error: new Error(`Failed to read files: ${errors}`),
        };
      }

      // Return combined successful results with verification
      const fileContents = results.reduce(
        (acc, r) => {
          if (r.success && r.content) {
            acc[r.path] = r.content;
          }
          return acc;
        },
        {} as Record<string, string>,
      );

      // Verify we have content for all files
      if (Object.keys(fileContents).length !== filePaths.length) {
        return {
          success: false,
          error: new Error("Some files were not read successfully"),
        };
      }

      // Debug logging
      console.log("Successfully read files:");
      Object.entries(fileContents).forEach(([path, content]) => {
        console.log(
          `\n[${path}]:\n${content.slice(0, 100)}${
            content.length > 100 ? "..." : ""
          }`,
        );
      });

      return { success: true, data: fileContents };
    } catch (error) {
      console.error("Error reading files:", error);
      return { success: false, error: error as Error };
    }
  }

  async write(
    filePath: string,
    content: string | Buffer,
  ): Promise<IFileOperationResult> {
    try {
      console.log("trying to write file", filePath);
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, content);
      return { success: true };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  async delete(filePath: string): Promise<IFileOperationResult> {
    try {
      console.log("trying to delete file", filePath);
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
      console.log("trying to copy file", source, destination);
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
      console.log("trying to move file", source, destination);
      await fs.ensureDir(path.dirname(destination));
      await fs.move(source, destination);
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
}
