import { ReadFileAction } from "@services/LLM/actions/ReadFileAction";
import { UnitTestMocker } from "@tests/mocks/UnitTestMocker";
import { container } from "tsyringe";
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
      jest
        .spyOn(readFileAction["actionTagsExtractor"], "extractTag")
        .mockReturnValue(null);

      const result = await readFileAction.execute(actionContent);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain(
        "Must include at least one <path> tag",
      );
    });

    it("should fail when path is empty", async () => {
      const actionContent = "<read_file><path></path></read_file>";
      jest
        .spyOn(readFileAction["actionTagsExtractor"], "extractTag")
        .mockReturnValue("");

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

      jest
        .spyOn(readFileAction["actionTagsExtractor"], "extractTag")
        .mockImplementation((_, tag) => {
          if (tag === "path") return filePath;
          return null;
        });

      jest
        .spyOn(readFileAction["fileOperations"], "exists")
        .mockResolvedValue(true);
      jest.spyOn(readFileAction["fileOperations"], "read").mockResolvedValue({
        success: true,
        data: fileContent,
      });

      const result = await readFileAction.execute(actionContent);

      expect(result.success).toBe(true);
      expect(result.data).toBe(fileContent);
      expect(readFileAction["fileOperations"].read).toHaveBeenCalledWith(
        filePath,
      );
    });

    it("should search for alternative path when file not found", async () => {
      const filePath = "/test/file.txt";
      const alternativePath = "/alternative/file.txt";
      const fileContent = "test content";
      const actionContent = `<read_file><path>${filePath}</path></read_file>`;

      jest
        .spyOn(readFileAction["actionTagsExtractor"], "extractTag")
        .mockImplementation((_, tag) => {
          if (tag === "path") return filePath;
          return null;
        });

      jest
        .spyOn(readFileAction["fileOperations"], "exists")
        .mockResolvedValue(false);
      jest
        .spyOn(readFileAction["fileSearch"], "findByName")
        .mockResolvedValue([alternativePath]);
      jest.spyOn(readFileAction["fileOperations"], "read").mockResolvedValue({
        success: true,
        data: fileContent,
      });

      const result = await readFileAction.execute(actionContent);

      expect(result.success).toBe(true);
      expect(result.data).toBe(fileContent);
      expect(readFileAction["fileSearch"].findByName).toHaveBeenCalledWith(
        "file.txt",
        expect.any(String),
      );
      expect(readFileAction["fileOperations"].read).toHaveBeenCalledWith(
        alternativePath,
      );
    });

    it("should fail when file not found and no alternatives exist", async () => {
      const filePath = "/test/file.txt";
      const actionContent = `<read_file><path>${filePath}</path></read_file>`;

      jest
        .spyOn(readFileAction["actionTagsExtractor"], "extractTag")
        .mockImplementation((_, tag) => {
          if (tag === "path") return filePath;
          return null;
        });

      jest
        .spyOn(readFileAction["fileOperations"], "exists")
        .mockResolvedValue(false);
      jest
        .spyOn(readFileAction["fileSearch"], "findByName")
        .mockResolvedValue([]);
      jest.spyOn(readFileAction["fileOperations"], "read").mockResolvedValue({
        success: false,
        error: new Error("File not found"),
      });

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

      jest
        .spyOn(readFileAction["actionTagsExtractor"], "extractTag")
        .mockImplementation((content) => {
          const matches = Array.from(content.matchAll(/<path>(.*?)<\/path>/g));
          return matches.map((match) => match[1]);
        });

      jest
        .spyOn(readFileAction["fileOperations"], "exists")
        .mockResolvedValue(true);
      jest
        .spyOn(readFileAction["fileOperations"], "readMultiple")
        .mockResolvedValue({
          success: true,
          data: combinedContent,
        });

      const result = await readFileAction.execute(actionContent);

      expect(result.success).toBe(true);
      expect(result.data).toBe(combinedContent);
      expect(
        readFileAction["fileOperations"].readMultiple,
      ).toHaveBeenCalledWith(filePaths);
    });

    it("should handle missing files in multiple file read", async () => {
      const filePaths = ["/test/file1.txt", "/test/file2.txt"];
      const combinedContent = "[File: /test/file1.txt]\nContent 1";
      const actionContent = `<read_file>
        <path>${filePaths[0]}</path>
        <path>${filePaths[1]}</path>
      </read_file>`;

      jest
        .spyOn(readFileAction["actionTagsExtractor"], "extractTag")
        .mockImplementation((content) => {
          const matches = Array.from(content.matchAll(/<path>(.*?)<\/path>/g));
          return matches.map((match) => match[1]);
        });

      jest
        .spyOn(readFileAction["fileOperations"], "exists")
        .mockResolvedValue(true);
      jest
        .spyOn(readFileAction["fileOperations"], "readMultiple")
        .mockResolvedValue({
          success: true,
          data: combinedContent,
        });

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

      jest
        .spyOn(readFileAction["actionTagsExtractor"], "extractTag")
        .mockImplementation((content) => {
          const matches = Array.from(content.matchAll(/<path>(.*?)<\/path>/g));
          return matches.map((match) => match[1]);
        });

      jest
        .spyOn(readFileAction["fileOperations"], "exists")
        .mockResolvedValue(true);
      jest
        .spyOn(readFileAction["fileOperations"], "readMultiple")
        .mockResolvedValue({
          success: false,
          error: new Error("Multiple file read error"),
        });

      const result = await readFileAction.execute(actionContent);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Multiple file read error");
    });
  });
});
