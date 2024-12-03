import fs from "fs-extra";
import path from "path";
import { container } from "tsyringe";
import { FileSearch } from "../FileSearch";

const testDir = path.join(__dirname, "test-files");

describe("FileSearch", () => {
  let fileSearch: FileSearch;

  beforeAll(async () => {
    fileSearch = container.resolve(FileSearch);
    await fs.ensureDir(testDir);
    await fs.writeFile(
      path.join(testDir, "test1.txt"),
      "This is a test file with searchable content",
    );
    await fs.writeFile(
      path.join(testDir, "test2.txt"),
      "Another test file with different content",
    );
    await fs.writeFile(
      path.join(testDir, "test3.txt"),
      "Searchable content appears multiple times in this file. Searchable content.",
    );
    await fs.writeFile(
      path.join(testDir, "special.txt"),
      "Special @#%&*() content",
    );
    await fs.writeFile(
      path.join(testDir, "large.txt"),
      "a".repeat(1024 * 1024 * 5), // 5MB file
    );
    await fs.writeFile(
      path.join(testDir, "nomatch.txt"),
      "No matching content here",
    );
  });

  afterAll(async () => {
    await fs.remove(testDir);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should search files correctly by content", async () => {
    const result = await fileSearch.findByContent(
      "searchable content",
      testDir,
    );
    expect(result).toHaveLength(2);
    expect(
      result
        .find((res) => res.path.endsWith("test1.txt"))
        ?.matches[0].content.toLowerCase(),
    ).toContain("searchable content");
    expect(
      result
        .find((res) => res.path.endsWith("test3.txt"))
        ?.matches[0].content.toLowerCase(),
    ).toContain("searchable content");
  });

  it("should return an empty array if no files match by content", async () => {
    const result = await fileSearch.findByContent(
      "xyz123uniquenonexistentstring",
      testDir,
    );
    expect(result).toEqual([]);
  });

  it("should find multiple files with matching content", async () => {
    const result = await fileSearch.findByContent("test file", testDir);
    expect(result).toHaveLength(2);
    expect(
      result
        .find((res) => res.path.endsWith("test1.txt"))
        ?.matches[0].content.toLowerCase(),
    ).toContain("test file");
    expect(
      result
        .find((res) => res.path.endsWith("test2.txt"))
        ?.matches[0].content.toLowerCase(),
    ).toContain("test file");
  });

  it("should handle non-existent directory", async () => {
    const nonExistentDir = path.join(__dirname, "non-existent-dir");
    const result = await fileSearch.findByContent(
      "searchable content",
      nonExistentDir,
    );
    expect(result).toEqual([]);
  });

  it("should handle empty directory", async () => {
    const emptyDir = path.join(__dirname, "empty-dir");
    await fs.ensureDir(emptyDir);
    const result = await fileSearch.findByContent(
      "searchable content",
      emptyDir,
    );
    await fs.remove(emptyDir);
    expect(result).toEqual([]);
  });

  it("should handle case insensitivity", async () => {
    const result = await fileSearch.findByContent(
      "SEARCHABLE CONTENT",
      testDir,
    );
    expect(result).toHaveLength(2);

    const test1Match = result.find((res) => res.path.endsWith("test1.txt"));
    const test3Match = result.find((res) => res.path.endsWith("test3.txt"));

    expect(test1Match).not.toBeUndefined();
    expect(test3Match).not.toBeUndefined();

    expect(test3Match?.matches).toHaveLength(2);
  });

  it("should find multiple matches in the same file", async () => {
    const result = await fileSearch.findByContent(
      "Searchable content",
      testDir,
    );
    const fileResult = result.find((res) => res.path.endsWith("test3.txt"));
    expect(fileResult).not.toBeUndefined();
    expect(fileResult?.matches).toHaveLength(2);
    expect(fileResult?.matches[0].content).toContain("Searchable content");
    expect(fileResult?.matches[1].content).toContain("Searchable content");
  });

  it("should handle special characters in content", async () => {
    const specialContent = "Special @#%&*() content";
    const result = await fileSearch.findByContent(specialContent, testDir);

    expect(result).toHaveLength(1);
    expect(
      result.find((res) => res.path.endsWith("special.txt"))?.matches[0]
        .content,
    ).toContain(specialContent);
  });

  it("should handle large files", async () => {
    const largeContent = "a".repeat(1024 * 1024 * 5); // 5MB file
    const result = await fileSearch.findByContent(
      largeContent.slice(0, 100),
      testDir,
    );

    expect(result).toHaveLength(1);
    expect(
      result.find((res) => res.path.endsWith("large.txt"))?.matches[0].content,
    ).toContain(largeContent.slice(0, 100));
  });

  it("should handle files with no matches", async () => {
    const result = await fileSearch.findByContent(
      "searchable content",
      testDir,
    );

    // Sort results to ensure consistent ordering
    const sortedResult = result.sort((a, b) => a.path.localeCompare(b.path));

    expect(sortedResult).toHaveLength(2);
    expect(sortedResult.map((r) => path.basename(r.path))).toEqual([
      "test1.txt",
      "test3.txt",
    ]);
    expect(
      sortedResult.find((res) => res.path.endsWith("nomatch.txt")),
    ).toBeUndefined();
  });

  it("should search files correctly by pattern", async () => {
    const result = await fileSearch.findByPattern("*.txt", testDir);
    expect(result).toHaveLength(6);
    expect(
      result.find((res) => res.path.endsWith("test1.txt")),
    ).not.toBeUndefined();
    expect(
      result.find((res) => res.path.endsWith("test2.txt")),
    ).not.toBeUndefined();
    expect(
      result.find((res) => res.path.endsWith("test3.txt")),
    ).not.toBeUndefined();
    expect(
      result.find((res) => res.path.endsWith("special.txt")),
    ).not.toBeUndefined();
    expect(
      result.find((res) => res.path.endsWith("large.txt")),
    ).not.toBeUndefined();
    expect(
      result.find((res) => res.path.endsWith("nomatch.txt")),
    ).not.toBeUndefined();
  });

  it("should return an empty array if no files match by pattern", async () => {
    const result = await fileSearch.findByPattern("*.md", testDir);
    expect(result).toEqual([]);
  });

  it("should find files by exact name", async () => {
    const result = await fileSearch.findByName("test1.txt", testDir);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("test1.txt");
  });

  it("should find files by fuzzy name", async () => {
    const result = await fileSearch.findByName("test1", testDir);
    expect(result).toContainEqual(expect.stringContaining("test1.txt"));
  });

  it("should handle non-existent directory in findByName", async () => {
    const nonExistentDir = path.join(__dirname, "non-existent-dir");
    const result = await fileSearch.findByName("test1.txt", nonExistentDir);
    expect(result).toEqual([]);
  });

  it("should handle empty directory in findByName", async () => {
    const emptyDir = path.join(__dirname, "empty-dir");
    await fs.ensureDir(emptyDir);
    const result = await fileSearch.findByName("test1.txt", emptyDir);
    await fs.remove(emptyDir);
    expect(result).toEqual([]);
  });

  it("should handle no matches in findByName", async () => {
    const result = await fileSearch.findByName(
      "xyz123uniquenonexistentstring",
      testDir,
    );
    expect(result).toEqual([]);
  });
});
