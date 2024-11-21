import { ActionsParser } from "@services/LLM/actions/ActionsParser";
import { DebugLogger } from "@services/logging/DebugLogger";
import { StreamHandler } from "@services/streaming/StreamHandler";
import { container } from "tsyringe";

jest.mock("@services/logging/DebugLogger");
jest.mock("@services/LLM/actions/ActionsParser");
jest.mock("@services/text/HTMLEntityDecoder");

describe("StreamHandler", () => {
  let streamHandler: StreamHandler;
  let mockDebugLogger: jest.Mocked<DebugLogger>;
  let mockActionsParser: jest.Mocked<ActionsParser>;
  let originalStdoutWrite: typeof process.stdout.write;

  beforeEach(() => {
    mockDebugLogger = container.resolve(
      DebugLogger,
    ) as jest.Mocked<DebugLogger>;
    mockActionsParser = container.resolve(
      ActionsParser,
    ) as jest.Mocked<ActionsParser>;

    streamHandler = new StreamHandler(mockDebugLogger, mockActionsParser);

    // Store original stdout.write
    originalStdoutWrite = process.stdout.write;

    // Mock stdout.write
    jest.spyOn(process.stdout, "write").mockImplementation(() => true);

    // Setup default decoder mock
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
});
