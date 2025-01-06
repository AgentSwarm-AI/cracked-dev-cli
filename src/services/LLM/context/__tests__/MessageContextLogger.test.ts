import { UnitTestMocker } from "@/jest/mocks/UnitTestMocker";
import { DebugLogger } from "@/services/logging/DebugLogger";
import { ConfigService } from "@services/ConfigService";
import { IConversationHistoryMessage } from "@services/LLM/ILLMProvider";
import fs from "fs";
import { container } from "tsyringe";
import { MessageContextLogger } from "../MessageContextLogger";
import { MessageContextStore } from "../MessageContextStore";

interface IContextData {
  conversationHistory: IConversationHistoryMessage[];
  operations: Record<
    string,
    {
      operationId: string;
      status: "pending" | "success" | "failed";
      result?: string;
      error?: string;
    }
  >;
}

describe("MessageContextLogger", () => {
  let unitTestMocker: UnitTestMocker;
  let messageContextLogger: MessageContextLogger;
  let messageContextStore: MessageContextStore;
  let configService: ConfigService;
  let debugLogger: DebugLogger;

  let fsWriteFileSyncSpy: jest.SpyInstance;
  let fsExistsSyncSpy: jest.SpyInstance;
  let debugLoggerLogSpy: jest.SpyInstance;

  beforeAll(() => {
    unitTestMocker = new UnitTestMocker();
  });

  beforeEach(() => {
    // Create instances with mocked dependencies
    messageContextStore = container.resolve(MessageContextStore);
    configService = container.resolve(ConfigService);
    debugLogger = container.resolve(DebugLogger);

    // Mock ConfigService to enable logging
    unitTestMocker.mockPrototypeWith(ConfigService, "getConfig", () => ({
      enableConversationLog: true,
      logDirectory: "logs",
    }));

    // Create MessageContextLogger instance with mocked dependencies
    messageContextLogger = new MessageContextLogger(
      debugLogger,
      configService,
      messageContextStore,
    );

    // Mock fs module functions
    fsWriteFileSyncSpy = unitTestMocker.spyModule(fs, "writeFileSync");
    fsExistsSyncSpy = unitTestMocker.mockModule(fs, "existsSync", true);
    debugLoggerLogSpy = unitTestMocker.spyPrototype(DebugLogger, "log");
  });

  afterEach(() => {
    unitTestMocker.clearAllMocks();
    jest.useRealTimers();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("should verify MessageContextStore injection", () => {
    expect(messageContextLogger["messageContextStore"]).toBeInstanceOf(
      MessageContextStore,
    );
    expect(messageContextStore).toBeInstanceOf(MessageContextStore);
  });

  it("should create history file if it doesn't exist", async () => {
    unitTestMocker.mockModule(fs, "existsSync", false);

    await messageContextLogger.updateConversationHistory();

    expect(fsExistsSyncSpy).toHaveBeenCalledWith(
      messageContextLogger.getConversationHistoryPath(),
    );
    expect(fsWriteFileSyncSpy).toHaveBeenCalledWith(
      messageContextLogger.getConversationHistoryPath(),
      "[]",
      "utf8",
    );
  });

  it("should handle error when creating history file", async () => {
    unitTestMocker.mockModule(fs, "existsSync", false);
    unitTestMocker.mockModuleImplementation(fs, "writeFileSync", () => {
      throw new Error("Failed to write file");
    });

    await messageContextLogger.updateConversationHistory();

    expect(debugLoggerLogSpy).toHaveBeenCalledWith(
      "MessageLogger",
      "Error creating conversation history file",
      expect.objectContaining({
        error: expect.any(Error),
        path: expect.any(String),
      }),
    );
  });

  it("should cleanup log files", async () => {
    await messageContextLogger.cleanupLogFiles();
    expect(fsWriteFileSyncSpy).toHaveBeenCalledWith(
      messageContextLogger.getConversationHistoryPath(),
      "[]",
      "utf8",
    );
    expect(debugLoggerLogSpy).toHaveBeenCalledWith(
      "MessageLogger",
      "Log files cleaned up",
      expect.any(Object),
    );
  });

  it("should handle error during cleanup of log files", async () => {
    unitTestMocker.mockModuleImplementation(fs, "writeFileSync", () => {
      throw new Error("Failed to write file");
    });
    await messageContextLogger.cleanupLogFiles();

    expect(debugLoggerLogSpy).toHaveBeenCalledWith(
      "MessageLogger",
      "Error cleaning up log files",
      expect.objectContaining({
        error: expect.any(Error),
        logDirectory: expect.any(String),
      }),
    );
  });

  it("should update conversation history", async () => {
    const messages: IConversationHistoryMessage[] = [
      { role: "user", content: "test message" },
    ];
    const systemInstructions = "test instructions";

    const mockContextData = {
      conversationHistory: messages,
      fileOperations: new Map(),
      commandOperations: new Map(),
      phaseInstructions: new Map(),
      systemInstructions: systemInstructions,
    };

    messageContextStore.setContextData(mockContextData);

    await messageContextLogger.updateConversationHistory();

    expect(fsWriteFileSyncSpy).toHaveBeenCalledWith(
      messageContextLogger.getConversationHistoryPath(),
      expect.stringContaining('"messages":'),
      "utf8",
    );
  });

  it("should get conversation history", async () => {
    const mockHistory = [
      {
        timestamp: new Date().toISOString(),
        messages: [{ role: "user", content: "test" }],
        systemInstructions: "test",
      },
    ];

    unitTestMocker.mockModuleImplementation(fs, "readFileSync", () =>
      JSON.stringify(mockHistory),
    );

    const history = await messageContextLogger.getConversationHistory();
    expect(history).toEqual(mockHistory[0].messages);
  });

  it("should handle empty conversation history", async () => {
    unitTestMocker.mockModuleImplementation(fs, "readFileSync", () => "[]");

    const history = await messageContextLogger.getConversationHistory();
    expect(history).toEqual([]);
  });

  it("should handle error when reading conversation history", async () => {
    unitTestMocker.mockModuleImplementation(fs, "readFileSync", () => {
      throw new Error("Failed to read file");
    });

    const history = await messageContextLogger.getConversationHistory();
    expect(history).toEqual([]);
    expect(debugLoggerLogSpy).toHaveBeenCalledWith(
      "MessageLogger",
      "Error reading conversation history",
      expect.objectContaining({
        error: expect.any(Error),
      }),
    );
  });
});
