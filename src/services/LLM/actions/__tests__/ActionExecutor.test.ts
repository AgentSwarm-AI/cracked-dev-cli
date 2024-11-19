import { FileOperations } from "../../../FileManagement/FileOperations";
import { FileSearch } from "../../../FileManagement/FileSearch";
import { DebugLogger } from "../../../logging/DebugLogger";
import { ActionExecutor } from "../ActionExecutor";
import { ActionTagsExtractor } from "../ActionTagsExtractor";
import { CommandAction } from "../CommandAction";
import { EndTaskAction } from "../EndTaskAction";
import { FileActions } from "../FileActions";
import { SearchAction } from "../SearchAction";

jest.mock("../FileActions");
jest.mock("../CommandAction");
jest.mock("../SearchAction");
jest.mock("../EndTaskAction");
jest.mock("../../../logging/DebugLogger");
jest.mock("../../../FileManagement/FileSearch");
jest.mock("../ActionTagsExtractor");
jest.mock("../../../FileManagement/FileOperations");

describe("ActionExecutor", () => {
  let actionExecutor: ActionExecutor;
  let mockFileActions: jest.Mocked<FileActions>;
  let mockCommandAction: jest.Mocked<CommandAction>;
  let mockSearchAction: jest.Mocked<SearchAction>;
  let mockEndTaskAction: jest.Mocked<EndTaskAction>;
  let mockFileOperations: jest.Mocked<FileOperations>;
  let mockFileSearch: jest.Mocked<FileSearch>;
  let mockActionTagsExtractor: jest.Mocked<ActionTagsExtractor>;
  let mockDebugLogger: jest.Mocked<DebugLogger>;

  beforeEach(() => {
    mockDebugLogger = new DebugLogger() as jest.Mocked<DebugLogger>;
    mockFileOperations = new FileOperations() as jest.Mocked<FileOperations>;
    mockFileSearch = new FileSearch() as jest.Mocked<FileSearch>;
    mockActionTagsExtractor =
      new ActionTagsExtractor() as jest.Mocked<ActionTagsExtractor>;

    mockFileActions = new FileActions(
      mockFileOperations,
      mockActionTagsExtractor,
    ) as jest.Mocked<FileActions>;
    mockCommandAction = new CommandAction(
      mockDebugLogger,
    ) as jest.Mocked<CommandAction>;
    mockSearchAction = new SearchAction(
      mockFileSearch,
      mockActionTagsExtractor,
    ) as jest.Mocked<SearchAction>;
    mockEndTaskAction = new EndTaskAction(
      mockActionTagsExtractor,
    ) as jest.Mocked<EndTaskAction>;

    actionExecutor = new ActionExecutor(
      mockFileActions,
      mockCommandAction,
      mockSearchAction,
      mockEndTaskAction,
    );

    // Setup default mock implementations
    mockDebugLogger.log.mockImplementation(() => {});
    mockDebugLogger.setDebug.mockImplementation(() => {});
    mockActionTagsExtractor.extractTag.mockImplementation(() => null);
    mockActionTagsExtractor.extractAllTagsWithContent.mockImplementation(
      () => [],
    );
  });

  it("should handle invalid action format", async () => {
    const content = "invalid content";

    const result = await actionExecutor.executeAction(content);

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe("Invalid action format");
  });

  it("should handle unknown action type", async () => {
    const content = `
      <unknown_action>
        <content>test</content>
      </unknown_action>
    `;

    const result = await actionExecutor.executeAction(content);

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe("Unknown action type: unknown_action");
  });
});
