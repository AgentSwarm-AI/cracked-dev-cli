/* eslint-disable @typescript-eslint/no-var-requires */
import { FileSearch } from "@services/FileManagement/FileSearch";
import { IFileSearchResult } from "@services/FileManagement/types/FileManagementTypes";
import path from "path";

jest.mock("fast-glob");
jest.mock("fs-extra");

describe("FileSearch", () => {
  const fg = require("fast-glob");
  const fsMock = require("fs-extra");

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findByPattern", () => {
    it("finds files by pattern and returns matching lines", async () => {
      const fileSearch = new FileSearch();
      const directory = path.resolve(__dirname, "mockDir");
      const pattern = "mockFile*";

      const expectedFilePath = path.join(directory, "mockFile1.txt");

      fg.mockResolvedValue([expectedFilePath]);
      fsMock.readFile.mockResolvedValue("line1\nline2\nmockPattern\nline4");

      const results: IFileSearchResult[] = await fileSearch.findByPattern(
        pattern,
        directory,
      );

      expect(results).toEqual([
        {
          path: expectedFilePath,
          matches: [
            { line: 1, content: "line1" },
            { line: 2, content: "line2" },
            { line: 3, content: "mockPattern" },
            { line: 4, content: "line4" },
          ],
        },
      ]);
    });

    it("returns empty array if no files match pattern", async () => {
      const fileSearch = new FileSearch();
      const directory = path.resolve(__dirname, "mockDir");
      const pattern = "nonExistent*";

      fg.mockResolvedValue([]);

      const results: IFileSearchResult[] = await fileSearch.findByPattern(
        pattern,
        directory,
      );

      expect(results).toEqual([]);
    });
  });

  describe("findByContent", () => {
    it("finds files by content and returns matching lines", async () => {
      const fileSearch = new FileSearch();
      const directory = path.resolve(__dirname, "mockDir");
      const searchContent = "mockContent";

      const file1Path = path.resolve(directory, "mockFile1.txt");
      const file2Path = path.resolve(directory, "mockFile2.txt");

      fg.mockResolvedValue([file1Path, file2Path]);
      fsMock.stat.mockResolvedValue({ isFile: () => true });
      fsMock.readFile.mockResolvedValueOnce(
        "dummy line\nmockContent\nanother line",
      );
      fsMock.readFile.mockResolvedValueOnce("unrelated content");

      const results: IFileSearchResult[] = await fileSearch.findByContent(
        searchContent,
        directory,
      );

      expect(results).toEqual([
        {
          path: file1Path,
          matches: [{ line: 2, content: "mockContent" }],
        },
      ]);
    });

    it("handles errors in file processing", async () => {
      const fileSearch = new FileSearch();
      const directory = path.resolve(__dirname, "mockDir");
      const searchContent = "mockContent";

      const file1Path = path.resolve(directory, "mockFile1.txt");

      fg.mockResolvedValue([file1Path]);
      fsMock.stat.mockResolvedValue({ isFile: () => true });
      fsMock.readFile.mockRejectedValue(new Error("Mocked read file error"));

      const results: IFileSearchResult[] = await fileSearch.findByContent(
        searchContent,
        directory,
      );

      expect(results).toEqual([]);
    });
  });

  describe("findByName", () => {
    it("finds files by name and returns relative paths", async () => {
      const fileSearch = new FileSearch();
      const directory = path.resolve(__dirname, "mockDir");
      const name = "mockFile1.txt";

      const expectedFilePath = path.join(directory, "mockFile1.txt");

      fg.mockResolvedValue([expectedFilePath]);

      const results: string[] = await fileSearch.findByName(name, directory);

      expect(results).toEqual([expectedFilePath]);
    });

    it("returns empty array if no files match name", async () => {
      const fileSearch = new FileSearch();
      const directory = path.resolve(__dirname, "mockDir");
      const name = "nonExistent.txt";

      fg.mockResolvedValue([]);

      const results: string[] = await fileSearch.findByName(name, directory);

      expect(results).toEqual([]);
    });

    it("finds files by exact name and directory", async () => {
      const fileSearch = new FileSearch();
      const directory = path.resolve(__dirname, "mockDir");
      const name = "subdir/mockFile1.txt";

      const expectedFilePath = path.join(directory, "subdir/mockFile1.txt");

      fg.mockResolvedValue([expectedFilePath]);

      const results: string[] = await fileSearch.findByName(name, directory);

      expect(results).toEqual([expectedFilePath]);
    });

    it("finds files by fuzzy name", async () => {
      const fileSearch = new FileSearch();
      const directory = path.resolve(__dirname, "mockDir");
      const name = "mockFile";

      const file1Path = path.join(directory, "mockFile1.txt");
      const file2Path = path.join(directory, "mockFile2.txt");

      fg.mockResolvedValue([file1Path, file2Path]);

      const results: string[] = await fileSearch.findByName(name, directory);

      expect(results).toEqual([file1Path, file2Path]);
    });

    it("handles errors in file processing", async () => {
      const fileSearch = new FileSearch();
      const directory = path.resolve(__dirname, "mockDir");
      const name = "mockFile1.txt";

      fg.mockRejectedValue(new Error("Mocked fast-glob error"));

      const results: string[] = await fileSearch.findByName(name, directory);

      expect(results).toEqual([]);
    });
  });
});