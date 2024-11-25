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

interface FuseResult {
  item: FileEntry;
  score?: number;
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

      // Get all files in directory
      const entries = await fg("**/*", {
        cwd: directory,
        dot: true,
        absolute: true,
        onlyFiles: true,
      });

      // Convert to FileEntry objects
      const fileEntries: FileEntry[] = entries.map((entry) => ({
        fullPath: entry,
        name: path.basename(entry),
        dir: path.dirname(entry),
      }));

      // First try exact name matches
      const exactMatches = fileEntries.filter(
        (entry) => entry.name === targetName,
      );

      this.debugLogger.log("FileSearch", "exact matches", exactMatches);

      if (exactMatches.length > 0) {
        // If we have exact matches, sort by directory similarity
        const fuse = new Fuse<FileEntry>(exactMatches, {
          includeScore: true,
          threshold: 0.3,
          keys: ["dir"],
        });

        const results = fuse.search(targetDir);
        this.debugLogger.log("FileSearch", "dir similarity results", results);

        if (results.length > 0) {
          return results.map((result: FuseResult) => result.item.fullPath);
        }

        // If no directory matches, return all exact name matches
        return exactMatches.map((entry) => entry.fullPath);
      }

      // If no exact matches, try fuzzy name matching
      const fuse = new Fuse<FileEntry>(fileEntries, {
        includeScore: true,
        threshold: 0.3,
        keys: [
          { name: "name", weight: 3 }, // Filename is most important
          { name: "dir", weight: 1 }, // Directory path has less weight
        ],
      });

      const results = fuse.search(targetName);
      this.debugLogger.log("FileSearch", "fuzzy search results", results);

      return results
        .filter((result: FuseResult) => result.score && result.score < 0.3)
        .map((result: FuseResult) => result.item.fullPath);
    } catch (error) {
      console.error("Error in findByName:", error);
      return [];
    }
  }
}
