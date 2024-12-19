import {
  IFileSearch,
  IFileSearchResult,
} from "@services/FileManagement/types/FileManagementTypes";
import fg from "fast-glob";
import fs from "fs-extra";
import Fuse from "fuse.js";
import path from "path";
import { autoInjectable } from "tsyringe";
import { DebugLogger } from "../logging/DebugLogger";

interface FileEntry {
  fullPath: string;
  name: string;
  dir: string;
}

@autoInjectable()
export class FileSearch implements IFileSearch {
  constructor(private debugLogger: DebugLogger) {}

  private findAllMatches(text: string, searchStr: string): number[] {
    const positions: number[] = [];
    let pos = text.indexOf(searchStr);
    while (pos !== -1) {
      positions.push(pos);
      pos = text.indexOf(searchStr, pos + 1);
    }
    return positions;
  }

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
      const searchTarget = searchContent.toLowerCase();

      for (const entry of entries) {
        try {
          const stats = await fs.stat(entry);
          if (!stats.isFile()) continue;

          const content = await fs.readFile(entry, "utf-8");
          const lines = content.split("\n");
          const matches = [];

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineToSearch = line.toLowerCase();

            const positions = this.findAllMatches(lineToSearch, searchTarget);

            for (const pos of positions) {
              matches.push({
                line: i + 1,
                content: line,
                position: pos,
              });
            }
          }

          if (matches.length > 0) {
            results.push({
              path: entry,
              matches,
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
      const targetName = path.basename(name);
      const targetDir = path.dirname(name);

      this.debugLogger.log("FileSearch", "findByName input", {
        name,
        targetName,
        targetDir,
        directory,
      });

      const entries = await fg("**/*", {
        cwd: directory,
        dot: true,
        absolute: true,
        onlyFiles: true,
      });

      if (!entries.length) {
        this.debugLogger.log("FileSearch", "No files found in directory", {
          directory,
        });
        return [];
      }

      const fileEntries: FileEntry[] = entries.map((entry) => ({
        fullPath: entry,
        name: path.basename(entry).toLowerCase(),
        dir: path.dirname(entry),
      }));

      const searchName = targetName.toLowerCase();

      // First try exact matches (case insensitive)
      const exactMatches = fileEntries.filter((entry) => {
        const entryName = entry.name;
        return (
          entryName === searchName ||
          entryName === `${searchName}.txt` ||
          entryName.startsWith(`${searchName}.`)
        );
      });

      this.debugLogger.log("FileSearch", "exact matches", exactMatches);

      if (exactMatches.length > 0) {
        return exactMatches
          .sort((a, b) => {
            // Prioritize exact matches
            const aExact =
              a.name === searchName || a.name === `${searchName}.txt`;
            const bExact =
              b.name === searchName || b.name === `${searchName}.txt`;
            if (aExact !== bExact) return aExact ? -1 : 1;
            return a.fullPath.length - b.fullPath.length;
          })
          .map((entry) => entry.fullPath);
      }

      // For fuzzy matching
      const fuse = new Fuse<FileEntry>(fileEntries, {
        includeScore: true,
        threshold: 0.3, // Stricter threshold
        minMatchCharLength: Math.min(3, searchName.length),
        keys: [
          { name: "name", weight: 1 }, // Only match on name
        ],
      });

      const results = fuse.search(searchName);
      this.debugLogger.log("FileSearch", "fuzzy search results", results);

      // Filter and sort results
      return results
        .filter((result) => {
          if (!result.score) return false;
          // Only accept very close matches
          return result.score < 0.2 || result.item.name.includes(searchName);
        })
        .slice(0, 5) // Limit results
        .map((result) => result.item.fullPath);
    } catch (error) {
      this.debugLogger.log("FileSearch", "Error in findByName", { error });
      return [];
    }
  }
}
