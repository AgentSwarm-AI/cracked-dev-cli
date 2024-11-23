import { ActionExecutor } from "@services/LLM/actions/ActionExecutor";
import { CommandAction } from "@services/LLM/actions/CommandAction";
import { EndTaskAction } from "@services/LLM/actions/EndTaskAction";
import { FileActions } from "@services/LLM/actions/FileActions";
import { RelativePathLookupAction } from "@services/LLM/actions/RelativePathLookupAction";
import { SearchAction } from "@services/LLM/actions/SearchAction";
import { WriteFileAction } from "@services/LLM/actions/WriteFileAction";
import { UnitTestMocker } from "@tests/mocks/UnitTestMocker";
import { container } from "tsyringe";

describe("ActionExecutor", () => {
  let actionExecutor: ActionExecutor;
  let mocker: UnitTestMocker;

  beforeAll(() => {
    actionExecutor = container.resolve(ActionExecutor);
  });

  beforeEach(() => {
    mocker = new UnitTestMocker();

    // Setup spies on prototype methods of dependencies
    mocker.spyOnPrototype(WriteFileAction, "execute", { success: true });
    mocker.spyOnPrototype(RelativePathLookupAction, "execute", {
      success: true,
      data: "/absolute/path/to/file",
    });
    mocker.spyOnPrototype(FileActions, "handleReadFile", { success: true });
    mocker.spyOnPrototype(CommandAction, "execute", { success: true });
    mocker.spyOnPrototype(SearchAction, "execute", { success: true });
    mocker.spyOnPrototype(EndTaskAction, "execute", { success: true });
  });

  afterEach(() => {
    mocker.clearAllMocks();
  });

  describe("tag validation", () => {
    it("should detect action without proper tag structure", async () => {
      const content = "write_file some content";
      const result = await actionExecutor.executeAction(content);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain(
        'Found "write_file" without proper XML tag structure',
      );
      expect(result.error?.message).toContain(
        "Tags must be wrapped in < > brackets",
      );
      expect(result.error?.message).toContain(
        "<write_file>content</write_file>",
      );
    });

    it("should detect missing closing tag", async () => {
      const content = "<write_file>some content";
      const result = await actionExecutor.executeAction(content);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("No valid action tags found");
      expect(result.error?.message).toContain(
        "Actions must be wrapped in XML-style tags",
      );
    });

    it("should detect missing opening tag", async () => {
      const content = "some content</write_file>";
      const result = await actionExecutor.executeAction(content);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("No valid action tags found");
      expect(result.error?.message).toContain(
        "Actions must be wrapped in XML-style tags",
      );
    });

    it("should accept properly formatted tags", async () => {
      const content =
        "<write_file><path>test.txt</path><content>test</content></write_file>";
      const innerContent = "<path>test.txt</path><content>test</content>";

      const writeSpy = mocker.spyOnPrototype(WriteFileAction, "execute", {
        success: true,
      });
      const result = await actionExecutor.executeAction(content);

      expect(result.success).toBe(true);
      expect(writeSpy).toHaveBeenCalledWith(innerContent);
    });
  });

  it("should handle invalid action format", async () => {
    const content = "invalid content";

    const result = await actionExecutor.executeAction(content);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("No valid action tags found");
  });

  it("should handle unknown action type", async () => {
    const content = `<unknown_action><content>test</content></unknown_action>`;

    const result = await actionExecutor.executeAction(content);

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe("Unknown action type: unknown_action");
  });

  it("should handle relative_path_lookup action", async () => {
    const content = `<relative_path_lookup><path>./some/path</path></relative_path_lookup>`;

    const lookupSpy = mocker.spyOnPrototype(
      RelativePathLookupAction,
      "execute",
      {
        success: true,
        data: "/absolute/path/to/file",
      },
    );
    const result = await actionExecutor.executeAction(content);

    expect(result.success).toBe(true);
    expect(result.data).toBe("/absolute/path/to/file");
    expect(lookupSpy).toHaveBeenCalledWith(content);
  });
});
