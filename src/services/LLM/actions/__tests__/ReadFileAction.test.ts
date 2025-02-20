import { FileOperations } from "@services/FileManagement/FileOperations";
import { ReadFileAction } from "@services/LLM/actions/ReadFileAction";
import { UnitTestMocker } from "@tests/mocks/UnitTestMocker";
import { container } from "tsyringe";
import { ActionTagsExtractor } from "../ActionTagsExtractor";
import { readFileActionBlueprint } from "../blueprints/readFileActionBlueprint";

describe("ReadFileAction", () => {
  let readFileAction: ReadFileAction;
  let mocker: UnitTestMocker;

  beforeAll(() => {
    readFileAction = container.resolve(ReadFileAction);
  });

  beforeEach(() => {
    mocker = new UnitTestMocker();
  });

  afterEach(() => {
    mocker.clearAllMocks();
  });

  describe("blueprint", () => {
    it("should return the correct blueprint", () => {
      const blueprint = (readFileAction as any).getBlueprint();
      expect(blueprint).toBe(readFileActionBlueprint);
    });
  });

  describe("parameter validation", () => {
    it("should fail when no path is provided", async () => {
      const actionContent = "<read_file></read_file>";

      mocker.mockPrototype(ActionTagsExtractor, "extractTag", null);

      const result = await readFileAction.execute(actionContent);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain(
        "Must include at least one <path> tag",
      );
    });

    it("should fail when path is empty", async () => {
      const actionContent = "<read_file><path></path></read_file>";

      mocker.mockPrototype(ActionTagsExtractor, "extractTag", "");

      const result = await readFileAction.execute(actionContent);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("Invalid paths found");
    });
  });

  describe("single file handling", () => {
    it("should read existing file successfully", async () => {
      const filePath = "/test/file.txt";
      const fileContent = "test content";
      const actionContent = `<read_file><path>${filePath}</path></read_file>`;

      mocker.mockPrototypeWith(ActionTagsExtractor, "extractTag", (_, tag) => {
        if (tag === "path") return filePath;
        return null;
      });

      mocker.mockPrototype(
        FileOperations,
        "read",
        Promise.resolve({
          success: true,
          data: fileContent,
        }),
      );

      const result = await readFileAction.execute(actionContent);

      expect(result.success).toBe(true);
      expect(result.data).toBe(fileContent);
      expect(readFileAction["fileOperations"].read).toHaveBeenCalledWith(
        filePath,
      );
    });

    it("should fail when file not found", async () => {
      const filePath = "/test/file.txt";
      const actionContent = `<read_file><path>${filePath}</path></read_file>`;

      mocker.mockPrototypeWith(ActionTagsExtractor, "extractTag", (_, tag) => {
        if (tag === "path") return filePath;
        return null;
      });

      mocker.mockPrototype(
        FileOperations,
        "read",
        Promise.resolve({
          success: false,
          error: new Error("File not found"),
        }),
      );

      const result = await readFileAction.execute(actionContent);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("File not found");
    });
  });

  describe("multiple file handling", () => {
    it("should read multiple files successfully", async () => {
      const filePaths = ["/test/file1.txt", "/test/file2.txt"];
      const combinedContent =
        "[File: /test/file1.txt]\nContent 1\n[File: /test/file2.txt]\nContent 2";
      const actionContent = `<read_file>
        <path>${filePaths[0]}</path>
        <path>${filePaths[1]}</path>
      </read_file>`;

      mocker.mockPrototypeWith(
        ActionTagsExtractor,
        "extractTag",
        (content: string) => {
          const matches = Array.from(content.matchAll(/<path>(.*?)<\/path>/g));
          return matches.map((match) => (match as RegExpMatchArray)[1].trim());
        },
      );

      mocker.mockPrototype(
        FileOperations,
        "readMultiple",
        Promise.resolve({
          success: true,
          data: combinedContent,
        }),
      );

      const result = await readFileAction.execute(actionContent);

      expect(result.success).toBe(true);
      expect(result.data).toBe(combinedContent);
      expect(
        readFileAction["fileOperations"].readMultiple,
      ).toHaveBeenCalledWith(filePaths);
    });

    it("should handle missing files in multiple file read", async () => {
      const filePaths = ["/test/file1.txt", "/test/file2.txt"];
      const actionContent = `<read_file>
        <path>${filePaths[0]}</path>
        <path>${filePaths[1]}</path>
      </read_file>`;

      mocker.mockPrototypeWith(
        ActionTagsExtractor,
        "extractTag",
        (content: string) => {
          const matches = Array.from(content.matchAll(/<path>(.*?)<\/path>/g));
          return matches.map((match) => (match as RegExpMatchArray)[1].trim());
        },
      );

      mocker.mockPrototype(
        FileOperations,
        "readMultiple",
        Promise.resolve({
          success: false,
          error: new Error("Failed to read files: /test/file2.txt"),
        }),
      );

      const result = await readFileAction.execute(actionContent);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain(
        "Failed to read files: /test/file2.txt",
      );
    });

    it("should handle multiple file read errors", async () => {
      const filePaths = ["/test/file1.txt", "/test/file2.txt"];
      const actionContent = `<read_file>
        <path>${filePaths[0]}</path>
        <path>${filePaths[1]}</path>
      </read_file>`;

      mocker.mockPrototypeWith(
        ActionTagsExtractor,
        "extractTag",
        (content: string) => {
          const matches = Array.from(content.matchAll(/<path>(.*?)<\/path>/g));
          return matches.map((match) => (match as RegExpMatchArray)[1].trim());
        },
      );

      mocker.mockPrototype(
        FileOperations,
        "readMultiple",
        Promise.resolve({
          success: false,
          error: new Error("Multiple file read error"),
        }),
      );

      const result = await readFileAction.execute(actionContent);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Multiple file read error");
    });
  });
});
