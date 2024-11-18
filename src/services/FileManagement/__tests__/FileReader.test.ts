import fs from "fs/promises";
import path from "path";
import { FileReader } from "../FileReader"; // Adjust the import based on the actual export

describe("FileReader", () => {
  const filePath = path.join(__dirname, "testFile.txt"); // Use a relative path
  const expectedContent = "Expected file content";

  beforeAll(async () => {
    // Create a test file with known content before running the tests
    await fs.writeFile(filePath, expectedContent, "utf-8");
  });

  afterAll(async () => {
    // Clean up the test file after running the tests
    await fs.unlink(filePath);
  });

  it("should read the instructions file correctly", async () => {
    const fileReader = new FileReader();
    const content = await fileReader.readInstructionsFile(filePath);
    expect(content).toEqual(expectedContent);
  });

  it("should throw a file not found error if the file does not exist", async () => {
    const nonExistentFilePath = path.join(__dirname, "nonexistentFile.txt");
    const fileReader = new FileReader();

    await expect(
      fileReader.readInstructionsFile(nonExistentFilePath),
    ).rejects.toThrow(/no such file or directory/); // Check for specific error message
  });
});
