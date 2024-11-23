import { ReadFileAction } from "../ReadFileAction";
import { FileOperations } from "@services/FileManagement/FileOperations";
import { FileSearch } from "@services/FileManagement/FileSearch";
import { ActionTagsExtractor } from "@services/LLM/actions/ActionTagsExtractor";
import { DebugLogger } from "@services/logging/DebugLogger";
import { UnitTestMocker } from "@tests/mocks/UnitTestMocker";
import { container } from "tsyringe";

describe("ReadFileAction", () => {
  let readFileAction: ReadFileAction;
  let mocker: UnitTestMocker;

  beforeAll(() => {
    mocker = new UnitTestMocker();
  });

  beforeEach(() => {
    mocker.clearAllMocks();

    // Setup spies on prototype methods of dependencies
    mocker.spyOnPrototype(FileOperations, "exists", jest.fn());
    mocker.spyOnPrototype(FileOperations, "read", jest.fn());
    mocker.spyOnPrototype(FileOperations, "readMultiple", jest.fn());
    mocker.spyOnPrototype(FileSearch, "findByName", jest.fn());
    mocker.spyOnPrototype(ActionTagsExtractor, "extractTags", jest.fn());
    mocker.spyOnPrototype(DebugLogger, "log", jest.fn());

    // Instantiate ReadFileAction after setting up mocks
    readFileAction = container.resolve(ReadFileAction);
  });

  it("should read a single file successfully", async () => {
    const filePath = "/path/to/file";
    const fileContent = "file content";

    jest.spyOn(FileOperations.prototype, "exists").mockResolvedValue(true);
    jest.spyOn(FileOperations.prototype, "read").mockResolvedValue({ success: true, data: fileContent });
    jest.spyOn(ActionTagsExtractor.prototype, "extractTags").mockReturnValue([filePath]);

    const actionInput = `<read_file><path>${filePath}</path></read_file>`;
    const result = await readFileAction.execute(actionInput);

    expect(FileOperations.prototype.exists).toHaveBeenCalledWith(filePath);
    expect(FileOperations.prototype.read).toHaveBeenCalledWith(filePath);
    expect(result).toEqual({ success: true, data: fileContent });
  });

  it("should search and read a single file when not found at original path", async () => {
    const originalPath = "/path/to/file";
    const foundPath = "/different/path/to/file";
    const fileContent = "file content";

    jest.spyOn(FileOperations.prototype, "exists").mockResolvedValue(false);
    jest.spyOn(FileSearch.prototype, "findByName").mockResolvedValue([foundPath]);
    jest.spyOn(FileOperations.prototype, "read").mockResolvedValue({ success: true, data: fileContent });
    jest.spyOn(ActionTagsExtractor.prototype, "extractTags").mockReturnValue([originalPath]);

    const actionInput = `<read_file><path>${originalPath}</path></read_file>`;
    const result = await readFileAction.execute(actionInput);

    expect(FileSearch.prototype.findByName).toHaveBeenCalledWith("file", process.cwd());
    expect(FileOperations.prototype.read).toHaveBeenCalledWith(foundPath);
    expect(result).toEqual({ success: true, data: fileContent });
  });

  it("should read multiple files successfully", async () => {
    const filePaths = ["/path/to/file1", "/path/to/file2"];
    const fileContents = `[File: /path/to/file1]
content1

[File: /path/to/file2]
content2`;

    jest.spyOn(FileOperations.prototype, "exists").mockResolvedValue(true);
    jest.spyOn(FileOperations.prototype, "readMultiple").mockResolvedValue({ success: true, data: fileContents });
    jest.spyOn(ActionTagsExtractor.prototype, "extractTags").mockReturnValue(filePaths);

    const actionInput = `<read_file>${filePaths.map((path) => `<path>${path}</path>`).join("")}</read_file>`;
    const result = await readFileAction.execute(actionInput);

    expect(FileOperations.prototype.exists).toHaveBeenCalledWith(filePaths[0]);
    expect(FileOperations.prototype.exists).toHaveBeenCalledWith(filePaths[1]);
    expect(FileOperations.prototype.readMultiple).toHaveBeenCalledWith(filePaths);
    expect(result).toEqual({ success: true, data: fileContents });
  });

  it("should fail if no path tags are provided", async () => {
    jest.spyOn(ActionTagsExtractor.prototype, "extractTags").mockReturnValue([]);

    const actionInput = "<read_file></read_file>";
    const result = await readFileAction.execute(actionInput);

    expect(ActionTagsExtractor.prototype.extractTags).toHaveBeenCalledWith(actionInput, "path");
    expect(result).toEqual({
      success: false,
      error: new Error("Invalid read_file format. Must include at least one <path> tag."),
    });
  });

  it("should handle file read failure", async () => {
    const filePath = "/path/to/file";
    const error = new Error("Read failed");

    jest.spyOn(FileOperations.prototype, "exists").mockResolvedValue(true);
    jest.spyOn(FileOperations.prototype, "read").mockResolvedValue({ success: false, error });
    jest.spyOn(ActionTagsExtractor.prototype, "extractTags").mockReturnValue([filePath]);

    const actionInput = `<read_file><path>${filePath}</path></read_file>`;
    const result = await readFileAction.execute(actionInput);

    expect(FileOperations.prototype.exists).toHaveBeenCalledWith(filePath);
    expect(FileOperations.prototype.read).toHaveBeenCalledWith(filePath);
    expect(result).toEqual({ success: false, error });
  });

  it("should handle empty file path", async () => {
    const filePath = "";
    jest.spyOn(ActionTagsExtractor.prototype, "extractTags").mockReturnValue([filePath]);

    const actionInput = `<read_file><path>${filePath}</path></read_file>`;
    const result = await readFileAction.execute(actionInput);

    expect(result).toMatchObject({
      success: false,
      error: new Error("Failed to read files:  - Try using a <search_file> to find the correct file path."),
    });
  });
});