import { container } from "tsyringe";
import { DirectoryScanner } from "./DirectoryScanner";
import { TreeResult } from "./types/DirectoryScannerTypes";

jest.mock("tree-cli", () => {
  return jest.fn();
});

describe("DirectoryScanner", () => {
  const mockTreeCli = jest.requireMock("tree-cli");
  let directoryScanner: DirectoryScanner;

  beforeEach(() => {
    jest.clearAllMocks();
    directoryScanner = container.resolve(DirectoryScanner);
  });

  it("should scan directory with default options", async () => {
    const mockResult: TreeResult = {
      name: "test-dir",
      size: 1024,
      type: "directory",
      children: [{ name: "file1.txt", size: 100, type: "file" }],
    };
    mockTreeCli.mockResolvedValue(mockResult);

    const result = await directoryScanner.scan("./test-dir");

    expect(result.success).toBe(true);
    expect(result.data).toBe(JSON.stringify(mockResult, null, 2));
    expect(mockTreeCli).toHaveBeenCalledWith(
      expect.objectContaining({
        base: "./test-dir",
        ignore: expect.arrayContaining(["node_modules"]),
        maxDepth: 4,
        noreport: true,
      }),
    );
  });

  it("should merge custom ignore patterns with defaults", async () => {
    const mockResult: TreeResult = { name: "test", size: 0, type: "directory" };
    mockTreeCli.mockResolvedValue(mockResult);
    const customIgnore = ["custom-ignore"];

    await directoryScanner.scan("./test-dir", { ignore: customIgnore });

    expect(mockTreeCli).toHaveBeenCalledWith(
      expect.objectContaining({
        ignore: expect.arrayContaining([...customIgnore, "node_modules"]),
      }),
    );
  });

  it("should use light scan options", async () => {
    const mockResult: TreeResult = { name: "test", size: 0, type: "directory" };
    mockTreeCli.mockResolvedValue(mockResult);

    await directoryScanner.scanLight("./test-dir");

    expect(mockTreeCli).toHaveBeenCalledWith(
      expect.objectContaining({
        maxDepth: 3,
        directoryFirst: true,
        noreport: true,
      }),
    );
  });

  it("should handle scan errors", async () => {
    const errorMessage = "Scan failed";
    mockTreeCli.mockRejectedValue(new Error(errorMessage));

    const result = await directoryScanner.scan("./test-dir");

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe(errorMessage);
  });
});
