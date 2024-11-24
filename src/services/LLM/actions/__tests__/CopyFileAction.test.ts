import { CopyFileAction } from "@services/LLM/actions/CopyFileAction";
import { UnitTestMocker } from "@tests/mocks/UnitTestMocker";
import { container } from "tsyringe";
import { copyFileActionBlueprint } from "../blueprints/copyFileActionBlueprint";

describe("CopyFileAction", () => {
  let copyFileAction: CopyFileAction;
  let mocker: UnitTestMocker;

  beforeAll(() => {
    copyFileAction = container.resolve(CopyFileAction);
  });

  beforeEach(() => {
    mocker = new UnitTestMocker();
    jest.clearAllMocks();
  });

  afterEach(() => {
    mocker.clearAllMocks();
  });

  describe("blueprint", () => {
    it("should return the correct blueprint", () => {
      const blueprint = (copyFileAction as any).getBlueprint();
      expect(blueprint).toBe(copyFileActionBlueprint);
    });
  });

  describe("tag validation", () => {
    it("should detect action without proper tag structure", async () => {
      const content = "copy_file some content";
      jest
        .spyOn(copyFileAction["actionTagsExtractor"], "validateStructure")
        .mockReturnValue('Found "copy_file" without proper XML tag structure');

      // Don't mock extractTag since it shouldn't be called
      const result = await copyFileAction.execute(content);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(
        'Found "copy_file" without proper XML tag structure',
      );
    });

    it("should detect missing closing tag", async () => {
      const content = "<copy_file>some content";
      jest
        .spyOn(copyFileAction["actionTagsExtractor"], "validateStructure")
        .mockReturnValue(
          "No valid action tags found. Actions must be wrapped in XML-style tags",
        );

      // Don't mock extractTag since it shouldn't be called
      const result = await copyFileAction.execute(content);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(
        "No valid action tags found. Actions must be wrapped in XML-style tags",
      );
    });

    it("should detect missing opening tag", async () => {
      const content = "some content</copy_file>";
      jest
        .spyOn(copyFileAction["actionTagsExtractor"], "validateStructure")
        .mockReturnValue(
          "No valid action tags found. Actions must be wrapped in XML-style tags",
        );

      // Don't mock extractTag since it shouldn't be called
      const result = await copyFileAction.execute(content);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(
        "No valid action tags found. Actions must be wrapped in XML-style tags",
      );
    });
  });

  describe("parameter validation", () => {
    it("should handle missing source path", async () => {
      const content =
        "<copy_file><destination_path>destination.txt</destination_path></copy_file>";

      jest
        .spyOn(copyFileAction["actionTagsExtractor"], "validateStructure")
        .mockReturnValue("");
      jest
        .spyOn(copyFileAction["actionTagsExtractor"], "extractTag")
        .mockImplementation((_, tag) => {
          if (tag === "source_path") return null;
          if (tag === "destination_path") return "destination.txt";
          return null;
        });

      const result = await copyFileAction.execute(content);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("No source path provided");
    });

    it("should handle missing destination path", async () => {
      const content =
        "<copy_file><source_path>source.txt</source_path></copy_file>";

      jest
        .spyOn(copyFileAction["actionTagsExtractor"], "validateStructure")
        .mockReturnValue("");
      jest
        .spyOn(copyFileAction["actionTagsExtractor"], "extractTag")
        .mockImplementation((_, tag) => {
          if (tag === "source_path") return "source.txt";
          if (tag === "destination_path") return null;
          return null;
        });

      const result = await copyFileAction.execute(content);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("No destination path provided");
    });
  });

  describe("file operations", () => {
    it("should handle copy operation success", async () => {
      const content =
        "<copy_file><source_path>source.txt</source_path><destination_path>destination.txt</destination_path></copy_file>";

      jest
        .spyOn(copyFileAction["actionTagsExtractor"], "validateStructure")
        .mockReturnValue("");
      jest
        .spyOn(copyFileAction["actionTagsExtractor"], "extractTag")
        .mockImplementation((_, tag) => {
          if (tag === "source_path") return "source.txt";
          if (tag === "destination_path") return "destination.txt";
          return null;
        });

      const logInfoSpy = jest.spyOn(copyFileAction as any, "logInfo");

      jest.spyOn(copyFileAction["fileOperations"], "copy").mockResolvedValue({
        success: true,
        data: undefined,
      });

      const result = await copyFileAction.execute(content);

      expect(result.success).toBe(true);
      expect(copyFileAction["fileOperations"].copy).toHaveBeenCalledWith(
        "source.txt",
        "destination.txt",
      );
      expect(logInfoSpy).toHaveBeenCalledWith("Source path: source.txt");
      expect(logInfoSpy).toHaveBeenCalledWith(
        "Destination path: destination.txt",
      );
    });

    it("should handle copy operation failure", async () => {
      const content =
        "<copy_file><source_path>source.txt</source_path><destination_path>destination.txt</destination_path></copy_file>";

      jest
        .spyOn(copyFileAction["actionTagsExtractor"], "validateStructure")
        .mockReturnValue("");
      jest
        .spyOn(copyFileAction["actionTagsExtractor"], "extractTag")
        .mockImplementation((_, tag) => {
          if (tag === "source_path") return "source.txt";
          if (tag === "destination_path") return "destination.txt";
          return null;
        });

      jest.spyOn(copyFileAction["fileOperations"], "copy").mockResolvedValue({
        success: false,
        error: new Error("Failed to copy file"),
      });

      const result = await copyFileAction.execute(content);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Failed to copy file");
    });

    it("should handle unexpected errors during copy", async () => {
      const content =
        "<copy_file><source_path>source.txt</source_path><destination_path>destination.txt</destination_path></copy_file>";

      jest
        .spyOn(copyFileAction["actionTagsExtractor"], "validateStructure")
        .mockReturnValue("");
      jest
        .spyOn(copyFileAction["actionTagsExtractor"], "extractTag")
        .mockImplementation((_, tag) => {
          if (tag === "source_path") return "source.txt";
          if (tag === "destination_path") return "destination.txt";
          return null;
        });

      jest
        .spyOn(copyFileAction["fileOperations"], "copy")
        .mockRejectedValue(new Error("Unexpected error"));

      const result = await copyFileAction.execute(content);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Unexpected error");
    });
  });
});
