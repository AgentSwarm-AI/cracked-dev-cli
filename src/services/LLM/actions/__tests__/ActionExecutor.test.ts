import { FileOperations } from "../../../FileManagement/FileOperations";
import { FileSearch } from "../../../FileManagement/FileSearch";
import { PathAdjuster } from "../../../FileManagement/PathAdjuster";
import { DebugLogger } from "../../../logging/DebugLogger";
import { AnsiStripper } from "../../../text/AnsiStripper";
import { HtmlEntityDecoder } from "../../../text/HTMLEntityDecoder";
import { ModelScaler } from "../../ModelScaler";
import { ActionExecutor } from "../ActionExecutor";
import { ActionTagsExtractor } from "../ActionTagsExtractor";
import { CommandAction } from "../CommandAction";
import { EndTaskAction } from "../EndTaskAction";
import { FileActions } from "../FileActions";
import { RelativePathLookupAction } from "../RelativePathLookupAction";
import { SearchAction } from "../SearchAction";
import { WriteFileAction } from "../WriteFileAction";

jest.mock("../FileActions");
jest.mock("../CommandAction");
jest.mock("../SearchAction");
jest.mock("../EndTaskAction");
jest.mock("../WriteFileAction");
jest.mock("../RelativePathLookupAction");
jest.mock("../../../logging/DebugLogger");
jest.mock("../../../FileManagement/FileSearch");
jest.mock("../ActionTagsExtractor");
jest.mock("../../../FileManagement/FileOperations");
jest.mock("../../../text/HTMLEntityDecoder");

describe("ActionExecutor", () => {
  let actionExecutor: ActionExecutor;
  let mockFileActions: jest.Mocked<FileActions>;
  let mockCommandAction: jest.Mocked<CommandAction>;
  let mockSearchAction: jest.Mocked<SearchAction>;
  let mockEndTaskAction: jest.Mocked<EndTaskAction>;
  let mockWriteFileAction: jest.Mocked<WriteFileAction>;
  let mockRelativePathLookupAction: jest.Mocked<RelativePathLookupAction>;
  let mockFileOperations: jest.Mocked<FileOperations>;
  let mockFileSearch: jest.Mocked<FileSearch>;
  let mockActionTagsExtractor: jest.Mocked<ActionTagsExtractor>;
  let mockDebugLogger: jest.Mocked<DebugLogger>;
  let mockHtmlEntityDecoder: jest.Mocked<HtmlEntityDecoder>;
  let mockPathAdjuster: jest.Mocked<PathAdjuster>;
  let mockAnsiStripper: jest.Mocked<AnsiStripper>;
  let mockModelScaler: jest.Mocked<ModelScaler>;

  beforeEach(() => {
    mockDebugLogger = new DebugLogger() as jest.Mocked<DebugLogger>;
    mockFileOperations = new FileOperations(
      mockPathAdjuster,
      mockDebugLogger,
    ) as jest.Mocked<FileOperations>;
    mockFileSearch = new FileSearch() as jest.Mocked<FileSearch>;
    mockActionTagsExtractor =
      new ActionTagsExtractor() as jest.Mocked<ActionTagsExtractor>;
    mockHtmlEntityDecoder =
      new HtmlEntityDecoder() as jest.Mocked<HtmlEntityDecoder>;

    mockFileActions = new FileActions(
      mockFileOperations,
      mockActionTagsExtractor,
    ) as jest.Mocked<FileActions>;
    mockCommandAction = new CommandAction(
      mockDebugLogger,
      mockAnsiStripper,
    ) as jest.Mocked<CommandAction>;
    mockSearchAction = new SearchAction(
      mockFileSearch,
      mockActionTagsExtractor,
    ) as jest.Mocked<SearchAction>;
    mockEndTaskAction = new EndTaskAction(
      mockActionTagsExtractor,
    ) as jest.Mocked<EndTaskAction>;
    mockModelScaler = new ModelScaler(
      mockDebugLogger,
    ) as jest.Mocked<ModelScaler>;

    mockWriteFileAction = new WriteFileAction(
      mockFileOperations,
      mockActionTagsExtractor,
      mockHtmlEntityDecoder,
      mockModelScaler,
    ) as jest.Mocked<WriteFileAction>;
    mockRelativePathLookupAction = new RelativePathLookupAction(
      mockPathAdjuster,
    ) as jest.Mocked<RelativePathLookupAction>;

    actionExecutor = new ActionExecutor(
      mockFileActions,
      mockCommandAction,
      mockSearchAction,
      mockEndTaskAction,
      mockWriteFileAction,
      mockRelativePathLookupAction,
    );

    // Setup default mock implementations
    mockDebugLogger.log.mockImplementation(() => {});
    mockDebugLogger.setDebug.mockImplementation(() => {});
    mockActionTagsExtractor.extractTag.mockImplementation(() => null);
    mockActionTagsExtractor.extractAllTagsWithContent.mockImplementation(
      () => [],
    );
    mockHtmlEntityDecoder.decode.mockImplementation((text) => text);
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
      mockWriteFileAction.execute.mockResolvedValue({ success: true });

      const result = await actionExecutor.executeAction(content);

      expect(result.success).toBe(true);
      expect(mockWriteFileAction.execute).toHaveBeenCalled();
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
    mockRelativePathLookupAction.execute.mockResolvedValue({
      success: true,
      data: "/absolute/path/to/file",
    });

    const result = await actionExecutor.executeAction(content);

    expect(result.success).toBe(true);
    expect(result.data).toBe("/absolute/path/to/file");
    expect(mockRelativePathLookupAction.execute).toHaveBeenCalledWith(content);
  });
});
