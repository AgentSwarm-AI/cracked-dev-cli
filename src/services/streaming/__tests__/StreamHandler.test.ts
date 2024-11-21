import { ActionsParser } from "@services/LLM/actions/ActionsParser";
import { DebugLogger } from "@services/logging/DebugLogger";
import { StreamHandler } from "@services/streaming/StreamHandler";
import { UnitTestMocker } from "@tests/mocks/UnitTestMocker";
import { container } from "tsyringe";

describe("StreamHandler", () => {
  let streamHandler: StreamHandler;
  let mocker: UnitTestMocker;

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
    (ActionsParser.prototype.isCompleteMessage as jest.Mock).mockReturnValue(false);
    (ActionsParser.prototype.parseAndExecuteActions as jest.Mock).mockResolvedValue({
      actions: [],
    });

    const result = await streamHandler.handleChunk(
      "test chunk",
      "test-model",
      async () => "",
      async () => {},
    );

    expect(result).toEqual([]);
    expect(ActionsParser.prototype.appendToBuffer).toHaveBeenCalledWith("test chunk");
  });

  it("should process actions when message is complete", async () => {
    (ActionsParser.prototype.isCompleteMessage as jest.Mock).mockReturnValue(true);
    (ActionsParser.prototype.parseAndExecuteActions as jest.Mock).mockResolvedValue({
      actions: [{ action: "test", result: "success" }],
    });

    jest.spyOn(ActionsParser.prototype, "isComplete", "get").mockReturnValue(false);

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
    // First chunk with complete message
    (ActionsParser.prototype.isCompleteMessage as jest.Mock).mockReturnValue(true);
    (ActionsParser.prototype.parseAndExecuteActions as jest.Mock).mockResolvedValue({
      actions: [{ action: "action1", result: "success1" }],
    });

    jest.spyOn(ActionsParser.prototype, "isComplete", "get").mockReturnValue(false);

    let result = await streamHandler.handleChunk(
      "first chunk",
      "test-model",
      async () => "",
      async () => {},
    );

    expect(result).toEqual([{ action: "action1", result: "success1" }]);
    expect(ActionsParser.prototype.clearBuffer).toHaveBeenCalled();
    expect(ActionsParser.prototype.isComplete).toBe(false);

    // Second chunk with complete message
    (ActionsParser.prototype.isCompleteMessage as jest.Mock).mockReturnValue(true);
    (ActionsParser.prototype.parseAndExecuteActions as jest.Mock).mockResolvedValue({
      actions: [{ action: "action2", result: "success2" }],
    });

    jest.spyOn(ActionsParser.prototype, "isComplete", "get").mockReturnValue(false);

    result = await streamHandler.handleChunk(
      "second chunk",
      "test-model",
      async () => "",
      async () => {},
    );

    expect(result).toEqual([{ action: "action2", result: "success2" }]);
    expect(ActionsParser.prototype.clearBuffer).toHaveBeenCalled();
    expect(ActionsParser.prototype.isComplete).toBe(false);
  });

  it("should reset all state properly", () => {
    streamHandler.reset();
    expect(ActionsParser.prototype.reset).toHaveBeenCalled();
  });

  it("should not process actions when already processing", async () => {
    (ActionsParser.prototype.isCompleteMessage as jest.Mock).mockReturnValue(true);
    jest.spyOn(ActionsParser.prototype, "isProcessing", "get").mockReturnValue(true);

    const result = await streamHandler.handleChunk(
      "test chunk",
      "test-model",
      async () => "",
      async () => {},
    );

    expect(result).toEqual([]);
    expect(ActionsParser.prototype.parseAndExecuteActions).not.toHaveBeenCalled();
  });
});