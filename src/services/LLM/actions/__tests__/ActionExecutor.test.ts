import { FileOperations } from "../../../FileManagement/FileOperations";
import { FileSearch } from "../../../FileManagement/FileSearch";
import { PathAdjuster } from "../../../FileManagement/PathAdjuster";
import { DebugLogger } from "../../../logging/DebugLogger";
import { AnsiStripper } from "../../../text/AnsiStripper";
import { HtmlEntityDecoder } from "../../../text/HTMLEntityDecoder";
import { ActionExecutor } from "../ActionExecutor";
import { ActionTagsExtractor } from "../ActionTagsExtractor";
import { CommandAction } from "../CommandAction";
import { EndTaskAction } from "../EndTaskAction";
import { FileActions } from "../FileActions";
import { SearchAction } from "../SearchAction";
import { WriteFileAction } from "../WriteFileAction";

jest.mock("../FileActions");
jest.mock("../CommandAction");
jest.mock("../SearchAction");
jest.mock("../EndTaskAction");
jest.mock("../WriteFileAction");
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
  let mockFileOperations: jest.Mocked<FileOperations>;
  let mockFileSearch: jest.Mocked<FileSearch>;
  let mockActionTagsExtractor: jest.Mocked<ActionTagsExtractor>;
  let mockDebugLogger: jest.Mocked<DebugLogger>;
  let mockHtmlEntityDecoder: jest.Mocked<HtmlEntityDecoder>;
  let mockPathAdjuster: jest.Mocked<PathAdjuster>;
  let mockAnsiStripper: jest.Mocked<AnsiStripper>;

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
    mockWriteFileAction = new WriteFileAction(
      mockFileOperations,
      mockActionTagsExtractor,
      mockHtmlEntityDecoder,
    ) as jest.Mocked<WriteFileAction>;

    actionExecutor = new ActionExecutor(
      mockFileActions,
      mockCommandAction,
      mockSearchAction,
      mockEndTaskAction,
      mockWriteFileAction,
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

  it("should handle invalid action format", async () => {
    const content = "invalid content";

    const result = await actionExecutor.executeAction(content);

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe("Invalid action format");
  });

  it("should handle unknown action type", async () => {
    const content = `\n      <unknown_action>\n        <content>test</content>\n      </unknown_action>\n    `;

    const result = await actionExecutor.executeAction(content);

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe("Unknown action type: unknown_action");
  });
});
