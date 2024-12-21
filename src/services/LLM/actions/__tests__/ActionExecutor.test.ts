import { ActionExecutor } from "@services/LLM/actions/ActionExecutor";
import { WriteFileAction } from "@services/LLM/actions/WriteFileAction";
import { UnitTestMocker } from "@tests/mocks/UnitTestMocker";
import { container } from "tsyringe";
import { RelativePathLookupAction } from "../RelativePathLookupAction";

describe("ActionExecutor", () => {
  let actionExecutor: ActionExecutor;
  let mocker: UnitTestMocker;

  beforeAll(() => {
    actionExecutor = container.resolve(ActionExecutor);
  });

  beforeEach(() => {
    mocker = new UnitTestMocker();
  });

  afterEach(() => {
    mocker.clearAllMocks();
  });

  describe("tag validation", () => {
    it("should detect invalid XML structure", async () => {
      const content = "write_file some content";
      const result = await actionExecutor.executeAction(content);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(
        "No valid action tags found. Actions must be wrapped in XML-style tags.",
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
        "<write_file><type>new</type><path>test.txt</path><content>test</content></write_file>";

      // Mock the WriteFileAction to return success
      const writeSpy = jest
        .spyOn(WriteFileAction.prototype, "execute")
        .mockResolvedValue({
          success: true,
          data: null,
        });

      const result = await actionExecutor.executeAction(content);

      expect(result.success).toBe(true);
      expect(writeSpy).toHaveBeenCalledWith(content);
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

    // Mock the RelativePathLookupAction to return success with data
    const lookupSpy = jest
      .spyOn(RelativePathLookupAction.prototype, "execute")
      .mockResolvedValue({
        success: true,
        data: "/absolute/path/to/file",
      });

    const result = await actionExecutor.executeAction(content);

    expect(result.success).toBe(true);
    expect(result.data).toBe("/absolute/path/to/file");
    expect(lookupSpy).toHaveBeenCalledWith(content);
  });
});
