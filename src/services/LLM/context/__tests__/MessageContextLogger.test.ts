/* eslint-disable @typescript-eslint/ban-ts-comment */
import { UnitTestMocker } from "@/jest/mocks/UnitTestMocker";
import { DebugLogger } from "@/services/logging/DebugLogger";
import { IConversationHistoryMessage } from "@services/LLM/ILLMProvider";
import fs from "fs";
import { container } from "tsyringe";
import { MessageContextBuilder } from "../MessageContextBuilder";
import {
  MessageContextLogger,
  MessageIActionResult,
} from "../MessageContextLogger";
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

  let logMessageSpy: jest.SpyInstance;
  let fsWriteFileSyncSpy: jest.SpyInstance;
  let fsAppendFileSyncSpy: jest.SpyInstance;
  let ensureLogDirectoryExistsSpy: jest.SpyInstance;
  let ensureHistoryFileExistsSpy: jest.SpyInstance;
  let debugLoggerLogSpy: jest.SpyInstance;
  let messageContextStoreSetContextDataSpy: jest.SpyInstance;
  let messageContextStoreGetContextDataSpy: jest.SpyInstance;
  let messageContextBuilderUpdateOperationResultSpy: jest.SpyInstance;
  let messageContextStore: MessageContextStore; // Added

  beforeAll(() => {
    unitTestMocker = new UnitTestMocker();
    messageContextLogger = container.resolve(MessageContextLogger);
    messageContextStore = container.resolve(MessageContextStore); // Added
  });

  beforeEach(() => {
    // Mock dependencies using spyPrototype/spyModule
    logMessageSpy = unitTestMocker.spyPrototype<MessageContextLogger, void>(
      MessageContextLogger,
      "logMessage",
    );
    fsWriteFileSyncSpy = unitTestMocker.spyModule(fs, "writeFileSync");
    fsAppendFileSyncSpy = unitTestMocker.spyModule(fs, "appendFileSync");
    ensureLogDirectoryExistsSpy = unitTestMocker.spyPrototype<
      MessageContextLogger,
      void
      //@ts-ignore
    >(MessageContextLogger, "ensureLogDirectoryExists");

    ensureHistoryFileExistsSpy = unitTestMocker.spyPrototype<
      MessageContextLogger,
      void
      //@ts-ignore
    >(MessageContextLogger, "ensureHistoryFileExists");

    debugLoggerLogSpy = unitTestMocker.spyPrototype(DebugLogger, "log");

    messageContextStoreSetContextDataSpy = unitTestMocker.spyPrototype(
      MessageContextStore,
      "setContextData",
    );
    messageContextStoreGetContextDataSpy = unitTestMocker.spyPrototype(
      MessageContextStore,
      "getContextData",
    );
    messageContextBuilderUpdateOperationResultSpy = unitTestMocker.spyPrototype(
      MessageContextBuilder,
      "updateOperationResult",
    );
  });

  afterEach(() => {
    unitTestMocker.clearAllMocks();
  });
  // Added Check
  it("should verify MessageContextStore injection", () => {
    expect(messageContextLogger["messageContextStore"]).toBeInstanceOf(
      MessageContextStore,
    );
    expect(messageContextStore).toBeInstanceOf(MessageContextStore);
  });

  it("should log a message", () => {
    const message = {
      role: "user" as "user" | "assistant" | "system",
      content: "test",
    };

    messageContextLogger.logMessage(message);
    expect(ensureLogDirectoryExistsSpy).toHaveBeenCalled();
    expect(ensureHistoryFileExistsSpy).toHaveBeenCalled();
    expect(logMessageSpy).toHaveBeenCalledWith(message);
    expect(fsAppendFileSyncSpy).toHaveBeenCalled();
  });

  it("should create history file if it doesn't exist", () => {
    // Mock fs.existsSync to return false
    unitTestMocker.mockModule(fs, "existsSync", false);

    messageContextLogger.logMessage({
      role: "user",
      content: "test",
    });

    expect(fs.existsSync).toHaveBeenCalledWith(
      messageContextLogger.getConversationHistoryPath(),
    );
    expect(fsWriteFileSyncSpy).toHaveBeenCalledWith(
      messageContextLogger.getConversationHistoryPath(),
      "[]",
      "utf8",
    );
    expect(ensureLogDirectoryExistsSpy).toHaveBeenCalled();
    expect(ensureHistoryFileExistsSpy).toHaveBeenCalled();
  });

  it("should handle error when creating history file", () => {
    // Mock fs.existsSync to return false
    unitTestMocker.mockModule(fs, "existsSync", false);
    // Properly mock fs.writeFileSync to throw an error
    unitTestMocker.mockModuleImplementation(fs, "writeFileSync", () => {
      throw new Error("Failed to write file");
    });

    messageContextLogger.logMessage({
      role: "user",
      content: "test",
    });

    expect(debugLoggerLogSpy).toHaveBeenCalledWith(
      "MessageLogger",
      "Error creating conversation history file",
      expect.objectContaining({
        error: expect.any(Error),
        path: expect.any(String),
      }),
    );
    // Additionally, ensure that "Message logged" is not called since history file creation failed
    expect(debugLoggerLogSpy).not.toHaveBeenCalledWith(
      "MessageLogger",
      "Message logged",
      expect.any(Object),
    );
  });

  it("should cleanup log files", () => {
    messageContextLogger.cleanupLogFiles();
    expect(ensureLogDirectoryExistsSpy).toHaveBeenCalled();
    expect(fsWriteFileSyncSpy).toHaveBeenCalledTimes(2);
    expect(fsWriteFileSyncSpy).toHaveBeenCalledWith(
      messageContextLogger.getConversationLogPath(),
      "",
      "utf8",
    );
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

  it("should handle error during cleanup of log files", () => {
    // Properly mock fs.writeFileSync to throw an error
    unitTestMocker.mockModuleImplementation(fs, "writeFileSync", () => {
      throw new Error("Failed to write file");
    });
    messageContextLogger.cleanupLogFiles();

    expect(debugLoggerLogSpy).toHaveBeenCalledWith(
      "MessageLogger",
      "Error cleaning up log files",
      expect.objectContaining({
        error: expect.any(Error),
        logDirectory: expect.any(String),
      }),
    );
  });

  const mockContextData: IContextData = {
    conversationHistory: [],
    operations: {},
  };

  it("should log an action result successfully", () => {
    const action = "testAction";
    const result: MessageIActionResult = { success: true, result: "success" };
    messageContextStoreGetContextDataSpy.mockReturnValue(mockContextData);

    messageContextLogger.logActionResult(action, result);

    expect(ensureLogDirectoryExistsSpy).toHaveBeenCalled();
    expect(ensureHistoryFileExistsSpy).toHaveBeenCalled();
    expect(fsAppendFileSyncSpy).toHaveBeenCalled();
    expect(messageContextStoreSetContextDataSpy).toHaveBeenCalled();
    expect(messageContextBuilderUpdateOperationResultSpy).toHaveBeenCalled();
    expect(messageContextBuilderUpdateOperationResultSpy).toHaveBeenCalledWith(
      action,
      action,
      result.result,
      mockContextData,
      result.success,
      undefined,
    );
  });

  it("should log an action result with error", () => {
    const action = "testAction";
    const error = new Error("test error");
    const result: MessageIActionResult = { success: false, error: error };
    messageContextStoreGetContextDataSpy.mockReturnValue(mockContextData);
    messageContextLogger.logActionResult(action, result);
    expect(ensureLogDirectoryExistsSpy).toHaveBeenCalled();
    expect(ensureHistoryFileExistsSpy).toHaveBeenCalled();
    expect(fsAppendFileSyncSpy).toHaveBeenCalled();
    expect(messageContextStoreSetContextDataSpy).toHaveBeenCalled();
    expect(messageContextBuilderUpdateOperationResultSpy).toHaveBeenCalled();
    expect(messageContextBuilderUpdateOperationResultSpy).toHaveBeenCalledWith(
      action,
      action,
      "",
      mockContextData,
      result.success,
      error.message,
    );
  });

  it("should log an action result and handle error writing to file", () => {
    // Properly mock fs.appendFileSync to throw an error
    unitTestMocker.mockModuleImplementation(fs, "appendFileSync", () => {
      throw new Error("Failed to write file");
    });
    const action = "testAction";
    const result: MessageIActionResult = { success: true, result: "success" };
    messageContextLogger.logActionResult(action, result);

    expect(debugLoggerLogSpy).toHaveBeenCalledWith(
      "MessageLogger",
      "Error writing action result to log file",
      expect.objectContaining({
        error: expect.any(Error),
        logDirectory: expect.any(String),
      }),
    );
  });

  it("should update conversation history with system instructions", () => {
    const messages = [
      { role: "user", content: "hello" },
    ] as IConversationHistoryMessage[];
    const systemInstructions = "system instructions";

    messageContextLogger.updateConversationHistory(
      messages,
      systemInstructions,
    );

    expect(ensureLogDirectoryExistsSpy).toHaveBeenCalled();
    expect(ensureHistoryFileExistsSpy).toHaveBeenCalled();
    expect(fsAppendFileSyncSpy).toHaveBeenCalledTimes(2); // system + message
    expect(fsWriteFileSyncSpy).toHaveBeenCalled();

    expect(debugLoggerLogSpy).toHaveBeenCalledWith(
      "MessageLogger",
      "Conversation history updated",
      expect.objectContaining({
        messagesCount: messages.length,
        hasSystemInstructions: true,
        logDirectory: expect.any(String),
      }),
    );
  });

  it("should update conversation history without system instructions", () => {
    const messages = [
      { role: "user", content: "hello" },
    ] as IConversationHistoryMessage[];
    const systemInstructions = null;
    messageContextLogger.updateConversationHistory(
      messages,
      systemInstructions,
    );
    expect(ensureLogDirectoryExistsSpy).toHaveBeenCalled();
    expect(ensureHistoryFileExistsSpy).toHaveBeenCalled();
    expect(fsAppendFileSyncSpy).toHaveBeenCalledTimes(1); //  message
    expect(fsWriteFileSyncSpy).toHaveBeenCalled();

    expect(debugLoggerLogSpy).toHaveBeenCalledWith(
      "MessageLogger",
      "Conversation history updated",
      expect.objectContaining({
        messagesCount: messages.length,
        hasSystemInstructions: false,
        logDirectory: expect.any(String),
      }),
    );
  });

  it("should handle error when updating conversation history", () => {
    // Properly mock fs.writeFileSync to throw an error
    unitTestMocker.mockModuleImplementation(fs, "writeFileSync", () => {
      throw new Error("Failed to write file");
    });

    const messages = [
      { role: "user", content: "hello" },
    ] as IConversationHistoryMessage[];
    const systemInstructions = "system instructions";
    messageContextLogger.updateConversationHistory(
      messages,
      systemInstructions,
    );

    expect(debugLoggerLogSpy).toHaveBeenCalledWith(
      "MessageLogger",
      "Error updating log files",
      expect.objectContaining({
        error: expect.any(Error),
        logDirectory: expect.any(String),
      }),
    );
  });

  it("should return correct log directory path", () => {
    const logDir = messageContextLogger.getLogDirectoryPath();
    expect(logDir).toBe("logs"); // Default from config in constructor
  });
  it("should return correct conversation log path", () => {
    const logPath = messageContextLogger.getConversationLogPath();
    expect(logPath).toContain("conversation.log");
  });
  it("should return correct conversation history path", () => {
    const historyPath = messageContextLogger.getConversationHistoryPath();
    expect(historyPath).toContain("conversationHistory.json");
  });

  it("should get conversation history", () => {
    const mockHistory = {
      timestamp: new Date().toISOString(),
      messages: [
        { role: "user", content: "hello" },
      ] as IConversationHistoryMessage[],
    };

    // Properly mock fs.readFileSync to return JSON string
    unitTestMocker.mockModuleImplementation(fs, "readFileSync", () =>
      JSON.stringify(mockHistory),
    );
    const history = messageContextLogger.getConversationHistory();

    expect(history).toEqual(mockHistory.messages);
  });
  it("should handle error when reading conversation history", () => {
    // Properly mock fs.readFileSync to throw an error
    unitTestMocker.mockModuleImplementation(fs, "readFileSync", () => {
      throw new Error("Failed to read file");
    });

    const history = messageContextLogger.getConversationHistory();

    expect(history).toEqual([]);
    expect(debugLoggerLogSpy).toHaveBeenCalledWith(
      "MessageLogger",
      "Error reading conversation history",
      expect.objectContaining({
        error: expect.any(Error),
        logDirectory: expect.any(String),
      }),
    );
  });
});
