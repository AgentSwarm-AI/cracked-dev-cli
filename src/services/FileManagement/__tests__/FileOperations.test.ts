import fs from "fs-extra";
import path from "path";
import { container } from "tsyringe";
import { FileOperations } from "../FileOperations";
import { IEditOperation } from "../types/FileManagementTypes";

const testDir = path.join(__dirname, "testDir");
const testFile = path.join(testDir, "testFile.txt");
const testContent = "Test file content";

describe("FileOperations.ts", () => {
  let fileOperations: FileOperations;

  beforeAll(() => {
    fileOperations = container.resolve(FileOperations);
    fs.ensureDirSync(testDir);
  });

  afterAll(async () => {
    await fs.remove(testDir);
  });

  beforeEach(async () => {
    await fs.ensureDir(testDir);
    await fs.writeFile(testFile, testContent, "utf-8");
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  it("should read a single file correctly", async () => {
    const result = await fileOperations.read(testFile);

    expect(result.success).toBe(true);
    expect(result.data).toBe(testContent);
    expect(result.error).toBeUndefined();
  });

  describe("readMultiple", () => {
    const testFile2 = path.join(testDir, "testFile2.txt");
    const testContent2 = "Second file content";

    beforeEach(async () => {
      await fs.writeFile(testFile2, testContent2, "utf-8");
    });

    it("should read multiple files correctly", async () => {
      const result = await fileOperations.readMultiple([testFile, testFile2]);

      expect(result.success).toBe(true);
      expect(result.data).toBe(
        `[File: ${testFile}]\\n${testContent}\\n\\n[File: ${testFile2}]\\n${testContent2}`,
      );
      expect(result.error).toBeUndefined();
    });

    it("should handle errors when reading non-existent files", async () => {
      const nonExistentFile = path.join(testDir, "nonexistent.txt");
      const result = await fileOperations.readMultiple([
        testFile,
        nonExistentFile,
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain("Failed to read files");
      expect(result.error?.message).toContain(nonExistentFile);
    });

    it("should handle empty file list", async () => {
      const result = await fileOperations.readMultiple([]);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("No files provided");
    });

    it("should handle partial failures", async () => {
      const emptyFile = path.join(testDir, "empty.txt");
      await fs.writeFile(emptyFile, "", "utf-8");

      const result = await fileOperations.readMultiple([testFile, emptyFile]);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("Empty content");
    });
  });

  it("should delete a file successfully", async () => {
    const result = await fileOperations.delete(testFile);

    expect(result.success).toBe(true);
    expect(await fs.pathExists(testFile)).toBe(false);
    expect(result.error).toBeUndefined();
  });

  it("should handle errors when deleting a non-existent file", async () => {
    const nonExistentFile = "nonexistentFile.txt";

    const result = await fileOperations.delete(nonExistentFile);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should copy a file successfully", async () => {
    const secondFile = path.join(testDir, "secondFile.txt");

    const result = await fileOperations.copy(testFile, secondFile);

    expect(result.success).toBe(true);
    expect(await fs.pathExists(secondFile)).toBe(true);
    expect(result.error).toBeUndefined();
    expect(await fs.readFile(secondFile, "utf-8")).toBe(testContent);
  });

  it("should handle errors when copying a non-existent file", async () => {
    const nonExistentFile = "nonexistentFile.txt";
    const secondFile = path.join(testDir, "secondFile.txt");

    const result = await fileOperations.copy(nonExistentFile, secondFile);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should move a file successfully", async () => {
    const secondFile = path.join(testDir, "secondFile.txt");

    const result = await fileOperations.move(testFile, secondFile);

    expect(result.success).toBe(true);
    expect(await fs.pathExists(testFile)).toBe(false);
    expect(await fs.pathExists(secondFile)).toBe(true);
    expect(result.error).toBeUndefined();
    expect(await fs.readFile(secondFile, "utf-8")).toBe(testContent);
  });

  it("should handle errors when moving a non-existent file", async () => {
    const nonExistentFile = "nonexistentFile.txt";
    const secondFile = path.join(testDir, "secondFile.txt");

    const result = await fileOperations.move(nonExistentFile, secondFile);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should check if a file exists", async () => {
    const result = await fileOperations.exists(testFile);

    expect(result).toBe(true);
  });

  it("should return false for a non-existent file", async () => {
    const result = await fileOperations.exists("nonexistentFile.txt");

    expect(result).toBe(false);
  });

  it("should return correct stats for a file", async () => {
    const result = await fileOperations.stats(testFile);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty("path", testFile);
    expect(result.data).toHaveProperty("size", testContent.length);
  });

  it("should handle errors when getting stats for a non-existent file", async () => {
    const result = await fileOperations.stats("nonexistentFile.txt");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should perform edit operations on a file", async () => {
    const operations: IEditOperation[] = [
      { type: "replace", pattern: "content", content: "value" },
      { type: "insert_after", pattern: "value", content: "!" },
      { type: "delete", pattern: "Test" },
    ];

    const result = await fileOperations.edit(testFile, operations);

    expect(result.success).toBe(true);

    const editedContent = await fs.readFile(testFile, "utf-8");

    expect(editedContent.trim()).toBe("file value!");
  });

  it("should handle errors when performing edit operations on a non-existent file", async () => {
    const nonExistentFile = "nonexistentFile.txt";
    const operations: IEditOperation[] = [
      { type: "replace", pattern: "content", content: "value" },
    ];

    const result = await fileOperations.edit(nonExistentFile, operations);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should handle empty content in edit operations", async () => {
    const operations: IEditOperation[] = [
      { type: "replace", pattern: "content", content: "" },
      { type: "insert_after", pattern: "Test", content: "!" },
      { type: "delete", pattern: "file" },
    ];

    const result = await fileOperations.edit(testFile, operations);

    expect(result.success).toBe(true);

    const editedContent = await fs.readFile(testFile, "utf-8");

    expect(editedContent.trim()).toBe("Test!");
  });

  it("should handle large files correctly", async () => {
    const largeContent = "a".repeat(1000000);
    await fs.writeFile(testFile, largeContent, "utf-8");

    const result = await fileOperations.read(testFile);

    expect(result.success).toBe(true);
    expect(result.data).toBe(largeContent);
    expect(result.error).toBeUndefined();
  });

  it("should write to a non-existent directory", async () => {
    const nonExistentDir = path.join(testDir, "nonExistentDir");
    const newFile = path.join(nonExistentDir, "newFile.txt");
    const content = "New file content";

    const result = await fileOperations.write(newFile, content);

    expect(result.success).toBe(true);
    expect(await fs.pathExists(newFile)).toBe(true);
    expect(result.error).toBeUndefined();
    expect(await fs.readFile(newFile, "utf-8")).toBe(content);
  });

  it("should handle errors when writing to a non-existent directory with no write permissions", async () => {
    const readOnlyDir = path.join(testDir, "readOnlyDir");
    await fs.ensureDir(readOnlyDir, 0o555); // Set directory to read-only

    const nonWritableFile = path.join(readOnlyDir, "nonWritableFile.txt");
    const content = "New file content";

    const result = await fileOperations.write(nonWritableFile, content);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should handle files with special characters in content correctly", async () => {
    const specialContent = "Test !@#$%^&*() content";
    await fs.writeFile(testFile, specialContent, "utf-8");

    const result = await fileOperations.read(testFile);

    expect(result.success).toBe(true);
    expect(result.data).toBe(specialContent);
    expect(result.error).toBeUndefined();
  });

  it("should write binary files correctly", async () => {
    const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04]);
    const newFile = path.join(testDir, "binaryFile.bin");

    const result = await fileOperations.write(newFile, binaryContent);

    expect(result.success).toBe(true);
    expect(await fs.pathExists(newFile)).toBe(true);
    expect(result.error).toBeUndefined();
    expect(await fs.readFile(newFile)).toEqual(binaryContent);
  });

  it("should move files between directories", async () => {
    const newDir = path.join(testDir, "newDir");
    await fs.ensureDir(newDir);
    const newFile = path.join(newDir, "movedFile.txt");

    const result = await fileOperations.move(testFile, newFile);

    expect(result.success).toBe(true);
    expect(await fs.pathExists(testFile)).toBe(false);
    expect(await fs.pathExists(newFile)).toBe(true);
    expect(result.error).toBeUndefined();
    expect(await fs.readFile(newFile, "utf-8")).toBe(testContent);
  });

  it("should handle edit operations with empty patterns", async () => {
    const operations: IEditOperation[] = [
      { type: "replace", pattern: "", content: "value" },
    ];

    const result = await fileOperations.edit(testFile, operations);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should handle edit operations with multiple matching patterns", async () => {
    const contentWithMultipleMatches = "repeat repeat repeat";
    await fs.writeFile(testFile, contentWithMultipleMatches, "utf-8");

    const operations: IEditOperation[] = [
      { type: "replace", pattern: "repeat", content: "match" },
    ];

    const result = await fileOperations.edit(testFile, operations);

    expect(result.success).toBe(true);
    const editedContent = await fs.readFile(testFile, "utf-8");

    expect(editedContent.trim()).toBe("match match match");
  });

  it("should copy files with special characters in paths", async () => {
    const specialFile = path.join(testDir, "special@file#name.txt");
    await fs.writeFile(specialFile, testContent, "utf-8");
    const destinationFile = path.join(testDir, "copied@file#name.txt");

    const result = await fileOperations.copy(specialFile, destinationFile);

    expect(result.success).toBe(true);
    expect(await fs.pathExists(destinationFile)).toBe(true);
    expect(result.error).toBeUndefined();
    expect(await fs.readFile(destinationFile, "utf-8")).toBe(testContent);
  });
});
