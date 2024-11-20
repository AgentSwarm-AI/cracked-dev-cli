import { container } from "tsyringe";
import { ActionsParser } from "../../LLM/actions/ActionsParser";
import { DebugLogger } from "../../logging/DebugLogger";
import { HtmlEntityDecoder } from "../../text/HTMLEntityDecoder";
import { StreamHandler } from "../StreamHandler";

jest.mock("../../logging/DebugLogger");
jest.mock("../../LLM/actions/ActionsParser");
jest.mock("../../text/HTMLEntityDecoder");

describe("StreamHandler", () => {
  let streamHandler: StreamHandler;
  let mockDebugLogger: jest.Mocked<DebugLogger>;
  let mockActionsParser: jest.Mocked<ActionsParser>;
  let mockHtmlEntityDecoder: jest.Mocked<HtmlEntityDecoder>;
  let originalStdoutWrite: typeof process.stdout.write;

  beforeEach(() => {
    mockDebugLogger = container.resolve(
      DebugLogger,
    ) as jest.Mocked<DebugLogger>;
    mockActionsParser = container.resolve(
      ActionsParser,
    ) as jest.Mocked<ActionsParser>;
    mockHtmlEntityDecoder = container.resolve(
      HtmlEntityDecoder,
    ) as jest.Mocked<HtmlEntityDecoder>;
    streamHandler = new StreamHandler(
      mockDebugLogger,
      mockActionsParser,
      mockHtmlEntityDecoder,
    );

    // Store original stdout.write
    originalStdoutWrite = process.stdout.write;

    // Mock stdout.write
    jest.spyOn(process.stdout, "write").mockImplementation(() => true);

    // Setup default decoder mock
    mockHtmlEntityDecoder.decode.mockImplementation((text) => text);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Restore original stdout.write
    process.stdout.write = originalStdoutWrite;
  });

  it("should handle a single chunk with no actions", async () => {
    mockActionsParser.isCompleteMessage.mockReturnValue(false);
    mockActionsParser.parseAndExecuteActions.mockResolvedValue({ actions: [] });

    const result = await streamHandler.handleChunk(
      "test chunk",
      "test-model",
      async () => "",
      async () => {},
    );

    expect(result).toEqual([]);
    expect(mockActionsParser.appendToBuffer).toHaveBeenCalledWith("test chunk");
  });

  it("should process actions when message is complete", async () => {
    mockActionsParser.isCompleteMessage.mockReturnValue(true);
    mockActionsParser.parseAndExecuteActions.mockResolvedValue({
      actions: [{ action: "test", result: "success" }],
    });

    const result = await streamHandler.handleChunk(
      "test chunk",
      "test-model",
      async () => "",
      async () => {},
    );

    expect(result).toEqual([{ action: "test", result: "success" }]);
    expect(mockActionsParser.clearBuffer).toHaveBeenCalled();
    expect(mockActionsParser.isComplete).toBe(false);
  });

  it("should handle multiple sequential actions", async () => {
    // First chunk with complete message
    mockActionsParser.isCompleteMessage.mockReturnValue(true);
    mockActionsParser.parseAndExecuteActions.mockResolvedValueOnce({
      actions: [{ action: "action1", result: "success1" }],
    });

    let result = await streamHandler.handleChunk(
      "first chunk",
      "test-model",
      async () => "",
      async () => {},
    );

    expect(result).toEqual([{ action: "action1", result: "success1" }]);
    expect(mockActionsParser.clearBuffer).toHaveBeenCalled();
    expect(mockActionsParser.isComplete).toBe(false);

    // Second chunk with complete message
    mockActionsParser.isCompleteMessage.mockReturnValue(true);
    mockActionsParser.parseAndExecuteActions.mockResolvedValueOnce({
      actions: [{ action: "action2", result: "success2" }],
    });

    result = await streamHandler.handleChunk(
      "second chunk",
      "test-model",
      async () => "",
      async () => {},
    );

    expect(result).toEqual([{ action: "action2", result: "success2" }]);
    expect(mockActionsParser.clearBuffer).toHaveBeenCalled();
    expect(mockActionsParser.isComplete).toBe(false);
  });

  it("should reset all state properly", () => {
    streamHandler.reset();
    expect(mockActionsParser.reset).toHaveBeenCalled();
  });

  it("should not process actions when already processing", async () => {
    mockActionsParser.isCompleteMessage.mockReturnValue(true);
    mockActionsParser.isProcessing = true;

    const result = await streamHandler.handleChunk(
      "test chunk",
      "test-model",
      async () => "",
      async () => {},
    );

    expect(result).toEqual([]);
    expect(mockActionsParser.parseAndExecuteActions).not.toHaveBeenCalled();
  });

  it("should decode HTML entities in chunks before processing", async () => {
    mockHtmlEntityDecoder.decode.mockReturnValue("decoded chunk");
    mockActionsParser.isCompleteMessage.mockReturnValue(false);
    mockActionsParser.parseAndExecuteActions.mockResolvedValue({ actions: [] });

    await streamHandler.handleChunk(
      "test &lt;chunk&gt;",
      "test-model",
      async () => "",
      async () => {},
    );

    // Verify chunk was decoded before being passed to actionsParser
    expect(mockHtmlEntityDecoder.decode).toHaveBeenCalledWith(
      "test &lt;chunk&gt;",
    );
    expect(mockActionsParser.appendToBuffer).toHaveBeenCalledWith(
      "decoded chunk",
    );
  });

  it("should decode HTML entities in action response chunks", async () => {
    mockHtmlEntityDecoder.decode
      .mockReturnValueOnce("decoded initial chunk")
      .mockReturnValueOnce("decoded action chunk");

    mockActionsParser.isCompleteMessage.mockReturnValue(true);
    mockActionsParser.parseAndExecuteActions.mockImplementation(
      async (_, __, callback) => {
        await callback("action message");
        return { actions: [] };
      },
    );

    await streamHandler.handleChunk(
      "initial &lt;chunk&gt;",
      "test-model",
      async () => "",
      async (_, cb) => {
        cb("action &lt;chunk&gt;");
      },
    );

    // Verify both initial chunk and action chunk were decoded
    expect(mockHtmlEntityDecoder.decode).toHaveBeenCalledWith(
      "initial &lt;chunk&gt;",
    );
    expect(mockHtmlEntityDecoder.decode).toHaveBeenCalledWith(
      "action &lt;chunk&gt;",
    );
  });
});
