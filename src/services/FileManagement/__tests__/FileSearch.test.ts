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

  // Updated tests
  it("should handle case insensitivity", async () => {
    const result = await fileSearch.findByContent(
      "searchable content",
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
});
