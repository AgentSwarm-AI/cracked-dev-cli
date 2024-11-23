import {
  IFileSearch,
  IFileSearchResult,
} from "@services/FileManagement/types/FileManagementTypes";
import fg from "fast-glob";
import fs from "fs-extra";
import path from "path";
import { autoInjectable } from "tsyringe";

@autoInjectable()
export class FileSearch implements IFileSearch {
  async findByPattern(
    pattern: string,
    directory: string,
  ): Promise<IFileSearchResult[]> {
    try {
      const entries = await fg(pattern, {
        cwd: directory,
        dot: true,
        absolute: true,
      });

      const results: IFileSearchResult[] = [];

      for (const entry of entries) {
        const content = await fs.readFile(entry, "utf-8");
        const lines = content.split("\n");

        results.push({
          path: entry,
          matches: lines.map((line, index) => ({
            line: index + 1,
            content: line,
          })),
        });
      }

      return results;
    } catch (error) {
      console.error("Error in findByPattern:", error);
      return [];
    }
  }

  async findByContent(
    searchContent: string,
    directory: string,
  ): Promise<IFileSearchResult[]> {
    try {
      const entries = await fg("**/*", {
        cwd: directory,
        dot: true,
        absolute: true,
      });

      const results: IFileSearchResult[] = [];

      for (const entry of entries) {
        try {
          const stats = await fs.stat(entry);
          if (!stats.isFile()) continue;

          const content = await fs.readFile(entry, "utf-8");
          const lines = content.split("\n");
          const matches = lines
            .map((line, index) => ({
              line: index + 1,
              content: line,
            }))
            .filter((line) => line.content.includes(searchContent));

          if (matches.length > 0) {
            results.push({
              path: entry,
              matches: matches,
            });
          }
        } catch (error) {
          console.error(`Error processing file ${entry}:`, error);
        }
      }

      return results;
    } catch (error) {
      console.error("Error in findByContent:", error);
      return [];
    }
  }

  async findByName(name: string, directory: string): Promise<string[]> {
    try {
      const pattern = `**/${name}`;
      const entries = await fg(pattern, {
        cwd: directory,
        dot: true,
        absolute: true,
      });

      return entries.map((entry) => path.relative(directory, entry));
    } catch (error) {
      console.error("Error in findByName:", error);
      return [];
    }
  }
}
