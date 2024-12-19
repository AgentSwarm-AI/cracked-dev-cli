import { FileSearch } from "@services/FileManagement/FileSearch";
import { DebugLogger } from "@services/logging/DebugLogger";
import fs from "fs-extra";
import path from "path";

describe("FileSearch", () => {
  let fileSearch: FileSearch;
  let testDir: string;
  const debugLogger = { log: jest.fn() } as unknown as DebugLogger;

  beforeEach(async () => {
    fileSearch = new FileSearch(debugLogger);
    testDir = path.join(process.cwd(), "test_files");
    await fs.ensureDir(testDir);

    // Create test files
    const testFiles = [
      "test1.txt",
      "test2.txt",
      "testing.txt",
      "other.txt",
      "nested/test1.json",
      "deeply/nested/test2.json",
    ];

    for (const file of testFiles) {
      const filePath = path.join(testDir, file);
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, "test content");
    }
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe("findByName", () => {
    it("should find exact matches", async () => {
      const result = await fileSearch.findByName("test1.txt", testDir);
      expect(result).toContainEqual(expect.stringContaining("test1.txt"));
    });

    it("should find files by name without extension", async () => {
      const result = await fileSearch.findByName("test1", testDir);
      expect(result).toContainEqual(expect.stringContaining("test1.txt"));
    });

    it("should find files with different extensions", async () => {
      const result = await fileSearch.findByName("test1", testDir);
      expect(result).toContainEqual(expect.stringContaining("test1.json"));
    });

    it("should find files by fuzzy name", async () => {
      const result = await fileSearch.findByName("test", testDir);
      expect(result).toContainEqual(expect.stringContaining("testing.txt"));
    });

    it("should handle case insensitive search", async () => {
      const result = await fileSearch.findByName("TEST1", testDir);
      expect(result).toContainEqual(expect.stringContaining("test1.txt"));
    });

    it("should prioritize exact matches", async () => {
      const result = await fileSearch.findByName("test1", testDir);
      expect(result[0]).toContain("test1");
    });

    it("should handle empty directory", async () => {
      const emptyDir = path.join(testDir, "empty");
      await fs.ensureDir(emptyDir);
      const result = await fileSearch.findByName("test", emptyDir);
      expect(result).toEqual([]);
    });

    it("should handle non-existent directory", async () => {
      const result = await fileSearch.findByName("test", "/non/existent/dir");
      expect(result).toEqual([]);
    });

    it("should handle special characters in filenames", async () => {
      await fs.writeFile(path.join(testDir, "test-special#1.txt"), "content");
      const result = await fileSearch.findByName("test-special#1", testDir);
      expect(result).toContainEqual(
        expect.stringContaining("test-special#1.txt"),
      );
    });
  });
});
