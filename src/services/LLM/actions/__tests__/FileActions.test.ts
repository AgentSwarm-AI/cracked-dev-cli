import { container } from "tsyringe";
import { FileActions } from "../FileActions";

describe("FileActions", () => {
  let fileActions: FileActions;

  beforeEach(() => {
    fileActions = container.resolve(FileActions);
  });

  it("should read a file successfully", async () => {
    const result = await fileActions.handleReadFile(
      "<path>package.json</path>",
    );
    expect(result.success).toBe(true);
  });

  it("should read multiple files successfully", async () => {
    const result = await fileActions.handleReadFile(
      "<path>package.json</path><path>tsconfig.json</path>",
    );
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it("should throw an error for an invalid path", async () => {
    await expect(fileActions.handleReadFile("<path></path>")).rejects.toThrow(
      "Invalid read_file format. Must include at least one <path> tag.",
    );
  });
});
