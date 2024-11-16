import fs from "fs";
import { container } from "tsyringe";
import { DirectoryScanner } from "./DirectoryScanner";

describe("DirectoryScanner.ts", () => {
  let directoryScanner: DirectoryScanner;

  beforeAll(() => {
    directoryScanner = container.resolve(DirectoryScanner);
  });

  it("should return a clean list of relative paths", async () => {
    const result = await directoryScanner.scan(".");

    expect(result.success).toBe(true);
    expect(typeof result.data).toBe("string");

    const paths = (result.data as string).split("\n");

    // Verify paths are relative and clean
    paths.forEach((path) => {
      expect(path).not.toContain("/home");
      if (fs.statSync(path).isDirectory()) {
        expect(path).toMatch(/\/$/);
      }
    });

    // Verify required folders are always ignored
    expect(paths).not.toContain("node_modules");
    expect(paths).not.toContain("node_modules/");
    expect(paths).not.toContain(".git");
    expect(paths).not.toContain(".git/");
  });

  it("should allow custom ignores while maintaining required ignores", async () => {
    const result = await directoryScanner.scan(".", {
      ignore: ["docs"],
    });

    expect(result.success).toBe(true);
    const paths = (result.data as string).split("\n");

    // Custom ignore should work
    expect(paths).not.toContain("docs");
    expect(paths).not.toContain("docs/");

    // Required ignores should still apply
    expect(paths).not.toContain("node_modules");
    expect(paths).not.toContain("node_modules/");
    expect(paths).not.toContain(".git");
    expect(paths).not.toContain(".git/");
  });
});
