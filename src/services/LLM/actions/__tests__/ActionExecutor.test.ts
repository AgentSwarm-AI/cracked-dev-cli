import { FileOperations } from "../../../FileManagement/FileOperations";
import { FileSearch } from "../../../FileManagement/FileSearch";
import { DebugLogger } from "../../../logging/DebugLogger";
import { ActionExecutor } from "../ActionExecutor";
import { ActionTagsExtractor } from "../ActionTagsExtractor";
import { CommandAction } from "../CommandAction";
import { EditFileAction } from "../EditFileAction";
import { EndTaskAction } from "../EndTaskAction";
import { FileActions } from "../FileActions";
import { SearchAction } from "../SearchAction";

jest.mock("../FileActions");
jest.mock("../CommandAction");
jest.mock("../SearchAction");
jest.mock("../EndTaskAction");
jest.mock("../EditFileAction");
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
  let mockEditFileAction: jest.Mocked<EditFileAction>;
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
    mockEditFileAction = new EditFileAction(
      mockFileOperations,
      mockActionTagsExtractor,
    ) as jest.Mocked<EditFileAction>;

    actionExecutor = new ActionExecutor(
      mockFileActions,
      mockCommandAction,
      mockSearchAction,
      mockEndTaskAction,
      mockEditFileAction,
    );

    // Setup default mock implementations
    mockDebugLogger.log.mockImplementation(() => {});
    mockDebugLogger.setDebug.mockImplementation(() => {});
    mockActionTagsExtractor.extractTag.mockImplementation(() => null);
    mockActionTagsExtractor.extractAllTagsWithContent.mockImplementation(
      () => [],
    );
  });

  it("should execute commands after other actions", async () => {
    const content = `
      <edit_file>
        <path>test.ts</path>
        <changes>
          <replace>
            <pattern>old</pattern>
            <content>new</content>
          </replace>
        </changes>
      </edit_file>
      <execute_command>npm run lint</execute_command>
    `;

    mockEditFileAction.execute.mockResolvedValue({ success: true });
    mockCommandAction.execute.mockResolvedValue({ success: true });

    const result = await actionExecutor.executeAction(content);

    expect(result.success).toBe(true);

    // Verify execution order using mock calls
    const calls =
      jest.mocked(mockEditFileAction.execute).mock.calls.length +
      jest.mocked(mockCommandAction.execute).mock.calls.length;
    expect(calls).toBe(2);
    expect(mockEditFileAction.execute).toHaveBeenCalled();
    expect(mockCommandAction.execute).toHaveBeenCalledWith("npm run lint");

    // Verify order by checking mock invocation order
    const editCallIndex = jest.mocked(mockEditFileAction.execute).mock
      .invocationCallOrder[0];
    const commandCallIndex = jest.mocked(mockCommandAction.execute).mock
      .invocationCallOrder[0];
    expect(editCallIndex).toBeLessThan(commandCallIndex);
  });

  it("should execute multiple commands after other actions", async () => {
    const content = `
      <edit_file>
        <path>test1.ts</path>
        <changes>
          <replace>
            <pattern>old1</pattern>
            <content>new1</content>
          </replace>
        </changes>
      </edit_file>
      <execute_command>npm run lint</execute_command>
      <edit_file>
        <path>test2.ts</path>
        <changes>
          <replace>
            <pattern>old2</pattern>
            <content>new2</content>
          </replace>
        </changes>
      </edit_file>
      <execute_command>npm run test</execute_command>
    `;

    mockEditFileAction.execute.mockResolvedValue({ success: true });
    mockCommandAction.execute.mockResolvedValue({ success: true });

    const result = await actionExecutor.executeAction(content);

    expect(result.success).toBe(true);

    // Get all invocation call orders
    const editCallOrders = jest.mocked(mockEditFileAction.execute).mock
      .invocationCallOrder;
    const commandCallOrders = jest.mocked(mockCommandAction.execute).mock
      .invocationCallOrder;

    // Verify all edits happen before all commands
    editCallOrders.forEach((editCall) => {
      commandCallOrders.forEach((commandCall) => {
        expect(editCall).toBeLessThan(commandCall);
      });
    });

    // Verify correct number of calls
    expect(mockEditFileAction.execute).toHaveBeenCalledTimes(2);
    expect(mockCommandAction.execute).toHaveBeenCalledTimes(2);
  });

  it("should stop execution if an action fails", async () => {
    const content = `
      <edit_file>
        <path>test.ts</path>
        <changes>
          <replace>
            <pattern>old</pattern>
            <content>new</content>
          </replace>
        </changes>
      </edit_file>
      <execute_command>npm run lint</execute_command>
    `;

    mockEditFileAction.execute.mockResolvedValue({
      success: false,
      error: new Error("Edit failed"),
    });

    const result = await actionExecutor.executeAction(content);

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe("Edit failed");
    expect(mockCommandAction.execute).not.toHaveBeenCalled();
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
