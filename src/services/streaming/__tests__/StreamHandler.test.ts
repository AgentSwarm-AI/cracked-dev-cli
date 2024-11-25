import { ActionsParser } from "@services/LLM/actions/ActionsParser";
import { DebugLogger } from "@services/logging/DebugLogger";
import { StreamHandler } from "@services/streaming/StreamHandler";
import { UnitTestMocker } from "@tests/mocks/UnitTestMocker";
import { container } from "tsyringe";

describe("StreamHandler", () => {
  let streamHandler: StreamHandler;
  let mocker: UnitTestMocker;

  // Constants from StreamHandler
  const MAX_BUFFER_SIZE = 10 * 1024 * 1024;
  const CHUNK_SIZE = 1024 * 1024;

  beforeAll(() => {
    mocker = new UnitTestMocker();
  });

  beforeEach(() => {
    mocker.spyOnPrototypeAndReturn(DebugLogger, "log", jest.fn());
    mocker.spyOnPrototypeAndReturn(ActionsParser, "appendToBuffer", jest.fn());
    mocker.spyOnPrototypeAndReturn(ActionsParser, "clearBuffer", jest.fn());
    mocker.spyOnPrototypeAndReturn(
      ActionsParser,
      "isCompleteMessage",
      jest.fn(),
    );
    mocker.spyOnPrototypeAndReturn(
      ActionsParser,
      "parseAndExecuteActions",
      jest.fn(),
    );
    mocker.spyOnPrototypeAndReturn(ActionsParser, "reset", jest.fn());

    // Mock getters/setters
    jest
      .spyOn(ActionsParser.prototype, "isComplete", "get")
      .mockReturnValue(false);
    jest
      .spyOn(ActionsParser.prototype, "isComplete", "set")
      .mockImplementation(function (this: any, value: boolean) {
        this._isComplete = value;
      });
    jest
      .spyOn(ActionsParser.prototype, "isProcessing", "get")
      .mockReturnValue(false);
    jest
      .spyOn(ActionsParser.prototype, "isProcessing", "set")
      .mockImplementation(function (this: any, value: boolean) {
        this._isProcessing = value;
      });
    jest.spyOn(ActionsParser.prototype, "buffer", "get").mockReturnValue("");

    streamHandler = container.resolve(StreamHandler);
  });

  afterEach(() => {
    mocker.clearAllMocks();
  });

  it("should handle a single chunk with no actions", async () => {
    (ActionsParser.prototype.isCompleteMessage as jest.Mock).mockReturnValue(
      false,
    );
    (
      ActionsParser.prototype.parseAndExecuteActions as jest.Mock
    ).mockResolvedValue({
      actions: [],
    });

    const result = await streamHandler.handleChunk(
      "test chunk",
      "test-model",
      async () => "",
      async () => {},
    );

    expect(result).toEqual([]);
    expect(ActionsParser.prototype.appendToBuffer).toHaveBeenCalledWith(
      "test chunk",
    );
  });

  it("should process actions when message is complete", async () => {
    (ActionsParser.prototype.isCompleteMessage as jest.Mock).mockReturnValue(
      true,
    );
    (
      ActionsParser.prototype.parseAndExecuteActions as jest.Mock
    ).mockResolvedValue({
      actions: [{ action: "test", result: "success" }],
    });

    const result = await streamHandler.handleChunk(
      "test chunk",
      "test-model",
      async () => "",
      async () => {},
    );

    expect(result).toEqual([{ action: "test", result: "success" }]);
    expect(ActionsParser.prototype.reset).toHaveBeenCalled();
  });

  it("should handle multiple sequential actions", async () => {
    (ActionsParser.prototype.isCompleteMessage as jest.Mock).mockReturnValue(
      true,
    );
    (
      ActionsParser.prototype.parseAndExecuteActions as jest.Mock
    ).mockResolvedValue({
      actions: [{ action: "action1", result: "success1" }],
    });

    let result = await streamHandler.handleChunk(
      "first chunk",
      "test-model",
      async () => "",
      async () => {},
    );

    expect(result).toEqual([{ action: "action1", result: "success1" }]);
    expect(ActionsParser.prototype.reset).toHaveBeenCalled();

    (
      ActionsParser.prototype.parseAndExecuteActions as jest.Mock
    ).mockResolvedValue({
      actions: [{ action: "action2", result: "success2" }],
    });

    result = await streamHandler.handleChunk(
      "second chunk",
      "test-model",
      async () => "",
      async () => {},
    );

    expect(result).toEqual([{ action: "action2", result: "success2" }]);
    expect(ActionsParser.prototype.reset).toHaveBeenCalled();
  });

  it("should reset all state properly", () => {
    streamHandler.reset();
    expect(ActionsParser.prototype.reset).toHaveBeenCalled();
  });

  it("should not process actions when already processing", async () => {
    (ActionsParser.prototype.isCompleteMessage as jest.Mock).mockReturnValue(
      true,
    );
    jest
      .spyOn(ActionsParser.prototype, "isProcessing", "get")
      .mockReturnValue(true);

    const result = await streamHandler.handleChunk(
      "test chunk",
      "test-model",
      async () => "",
      async () => {},
    );

    expect(result).toEqual([]);
    expect(
      ActionsParser.prototype.parseAndExecuteActions,
    ).not.toHaveBeenCalled();
  });

  it("should handle chunks when the message is not complete", async () => {
    (ActionsParser.prototype.isCompleteMessage as jest.Mock).mockReturnValue(
      false,
    );

    const result = await streamHandler.handleChunk(
      "incomplete chunk",
      "test-model",
      async () => "",
      async () => {},
    );

    expect(result).toEqual([]);
    expect(ActionsParser.prototype.appendToBuffer).toHaveBeenCalledWith(
      "incomplete chunk",
    );
  });

  it("should handle error in parseAndExecuteActions", async () => {
    (ActionsParser.prototype.isCompleteMessage as jest.Mock).mockReturnValue(
      true,
    );

    const error = new Error("Test error");
    (
      ActionsParser.prototype.parseAndExecuteActions as jest.Mock
    ).mockImplementation(() => {
      throw error;
    });

    const debugLoggerLogSpy = jest.spyOn(
      (streamHandler as any).debugLogger,
      "log",
    );

    const result = await streamHandler.handleChunk(
      "test chunk",
      "test-model",
      async () => "",
      async () => {},
    );

    expect(result).toEqual([]);
    expect(debugLoggerLogSpy).toHaveBeenCalledTimes(2);
    expect(debugLoggerLogSpy).toHaveBeenNthCalledWith(
      1,
      "Error",
      "Error processing actions",
      { error },
    );
    expect(debugLoggerLogSpy).toHaveBeenNthCalledWith(
      2,
      "Error",
      "Test error",
      {
        title: "Error",
        suggestion:
          "Try your request again. If the issue persists, try with different parameters.",
      },
    );
  });

  it("should handle empty chunk", async () => {
    (ActionsParser.prototype.isCompleteMessage as jest.Mock).mockReturnValue(
      false,
    );

    const result = await streamHandler.handleChunk(
      "",
      "test-model",
      async () => "",
      async () => {},
    );

    expect(result).toEqual([]);
    expect(ActionsParser.prototype.appendToBuffer).toHaveBeenCalledWith("");
  });

  it("should handle chunk with special characters", async () => {
    const specialChunk = "test \n chunk \t with \r special \b characters";
    (ActionsParser.prototype.isCompleteMessage as jest.Mock).mockReturnValue(
      false,
    );

    const result = await streamHandler.handleChunk(
      specialChunk,
      "test-model",
      async () => "",
      async () => {},
    );

    expect(result).toEqual([]);
    expect(ActionsParser.prototype.appendToBuffer).toHaveBeenCalledWith(
      specialChunk,
    );
  });
});
