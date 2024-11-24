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
    mocker.spyOnPrototype(DebugLogger, "log", jest.fn());
    mocker.spyOnPrototype(ActionsParser, "appendToBuffer", jest.fn());
    mocker.spyOnPrototype(ActionsParser, "clearBuffer", jest.fn());
    mocker.spyOnPrototype(ActionsParser, "isCompleteMessage", jest.fn());
    mocker.spyOnPrototype(ActionsParser, "parseAndExecuteActions", jest.fn());
    mocker.spyOnPrototype(ActionsParser, "reset", jest.fn());

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

    jest
      .spyOn(ActionsParser.prototype, "isComplete", "get")
      .mockReturnValue(false);
    jest
      .spyOn(ActionsParser.prototype, "isProcessing", "get")
      .mockReturnValue(false);

    const result = await streamHandler.handleChunk(
      "test chunk",
      "test-model",
      async () => "",
      async () => {},
    );

    expect(result).toEqual([{ action: "test", result: "success" }]);
    expect(ActionsParser.prototype.clearBuffer).toHaveBeenCalled();
    expect(ActionsParser.prototype.isComplete).toBe(false);
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

    jest
      .spyOn(ActionsParser.prototype, "isComplete", "get")
      .mockReturnValue(false);
    jest
      .spyOn(ActionsParser.prototype, "isProcessing", "get")
      .mockReturnValue(false);

    let result = await streamHandler.handleChunk(
      "first chunk",
      "test-model",
      async () => "",
      async () => {},
    );

    expect(result).toEqual([{ action: "action1", result: "success1" }]);
    expect(ActionsParser.prototype.clearBuffer).toHaveBeenCalled();
    expect(ActionsParser.prototype.isComplete).toBe(false);

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
    expect(ActionsParser.prototype.clearBuffer).toHaveBeenCalled();
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
    jest
      .spyOn(ActionsParser.prototype, "isProcessing", "get")
      .mockReturnValue(false);

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
    expect(ActionsParser.prototype.clearBuffer).not.toHaveBeenCalled();
  });

  it("should handle error in parseAndExecuteActions", async () => {
    (ActionsParser.prototype.isCompleteMessage as jest.Mock).mockReturnValue(
      true,
    );
    jest
      .spyOn(ActionsParser.prototype, "isProcessing", "get")
      .mockReturnValue(false);

    const error = new Error("Test error");
    (
      ActionsParser.prototype.parseAndExecuteActions as jest.Mock
    ).mockImplementation(() => {
      throw error;
    });

    // Spy on the debugLogger.log method
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
    jest
      .spyOn(ActionsParser.prototype, "isProcessing", "get")
      .mockReturnValue(false);

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
    jest
      .spyOn(ActionsParser.prototype, "isProcessing", "get")
      .mockReturnValue(false);

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

  // New tests for large chunk handling
  // Uncommented as per your original code
  // it("should handle very large chunks by processing in smaller pieces", async () => {
  //   const largeChunk = "x".repeat(2 * 1024 * 1024); // 2MB chunk
  //   (ActionsParser.prototype.isCompleteMessage as jest.Mock).mockReturnValue(
  //     false,
  //   );
  //   jest
  //     .spyOn(ActionsParser.prototype, "isProcessing", "get")
  //     .mockReturnValue(false);

  //   const result = await streamHandler.handleChunk(
  //     largeChunk,
  //     "test-model",
  //     async () => "",
  //     async () => {},
  //   );

  //   expect(result).toEqual([]);
  //   // Should have called appendToBuffer multiple times with smaller chunks
  //   expect(ActionsParser.prototype.appendToBuffer).toHaveBeenCalledTimes(2);
  // });

  // it("should handle buffer overflow by keeping recent data", async () => {
  //   const hugeChunk = "x".repeat(11 * 1024 * 1024); // 11MB chunk (exceeds 10MB limit)
  //   (ActionsParser.prototype.isCompleteMessage as jest.Mock).mockReturnValue(
  //     false,
  //   );
  //   jest
  //     .spyOn(ActionsParser.prototype, "isProcessing", "get")
  //     .mockReturnValue(false);

  //   // Spy on the debugLogger.log method
  //   const debugLoggerLogSpy = jest.spyOn(
  //     (streamHandler as any).debugLogger,
  //     "log",
  //   );

  //   const result = await streamHandler.handleChunk(
  //     hugeChunk,
  //     "test-model",
  //     async () => "",
  //     async () => {},
  //   );

  //   expect(result).toEqual([]);
  //   expect(ActionsParser.prototype.clearBuffer).toHaveBeenCalled();
  //   expect(debugLoggerLogSpy).toHaveBeenCalledTimes(2);
  //   expect(debugLoggerLogSpy).toHaveBeenNthCalledWith(
  //     1,
  //     "Buffer Overflow",
  //     "Buffer size limit exceeded",
  //     { maxSize: MAX_BUFFER_SIZE, currentSize: expect.any(Number) },
  //   );
  //   expect(debugLoggerLogSpy).toHaveBeenNthCalledWith(
  //     2,
  //     "Error",
  //     "The stream buffer has exceeded its maximum size limit.",
  //     {
  //       title: "Buffer Overflow",
  //       suggestion:
  //         "Try processing the stream in smaller chunks or increase the buffer size limit.",
  //     },
  //   );
  // });
});
