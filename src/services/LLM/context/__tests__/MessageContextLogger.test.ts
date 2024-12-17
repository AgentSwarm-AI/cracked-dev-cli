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
  let messageContextStore: MessageContextStore;

  let logMessageSpy: jest.SpyInstance;
  let fsWriteFileSyncSpy: jest.SpyInstance;
  let fsAppendFileSyncSpy: jest.SpyInstance;
  let ensureLogDirectoryExistsSpy: jest.SpyInstance;
  let ensureHistoryFileExistsSpy: jest.SpyInstance;
  let debugLoggerLogSpy: jest.SpyInstance;
  let messageContextStoreSetContextDataSpy: jest.SpyInstance;
  let messageContextStoreGetContextDataSpy: jest.SpyInstance;
  let messageContextBuilderUpdateOperationResultSpy: jest.SpyInstance;

  const mockContextData: IContextData = {
    conversationHistory: [],
    operations: {},
  };

  beforeAll(() => {
    unitTestMocker = new UnitTestMocker();
    messageContextStore = container.resolve(MessageContextStore);
    messageContextLogger = container.resolve(MessageContextLogger);
  });

  beforeEach(() => {
    // Reset lock state
    Object.defineProperty(messageContextLogger, "isLogging", {
      get: () => false,
      set: (value) => value,
      configurable: true,
    });

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
    messageContextStoreGetContextDataSpy = unitTestMocker.mockPrototype(
      MessageContextStore,
      "getContextData",
      mockContextData,
    );
    messageContextBuilderUpdateOperationResultSpy = unitTestMocker.spyPrototype(
      MessageContextBuilder,
      "updateOperationResult",
    );

    // Mock fs.existsSync for path checks
    unitTestMocker.mockModule(fs, "existsSync", true);
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

  it("should log a message", async () => {
    const message = {
      role: "user" as const,
      content: "test",
    };

    await messageContextLogger.logMessage(message);
    expect(ensureLogDirectoryExistsSpy).toHaveBeenCalled();
    expect(ensureHistoryFileExistsSpy).toHaveBeenCalled();
    expect(fsAppendFileSyncSpy).toHaveBeenCalled();
  });

  it("should create history file if it doesn't exist", async () => {
    unitTestMocker.mockModule(fs, "existsSync", false);

    await messageContextLogger.logMessage({
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

  it("should handle error when creating history file", async () => {
    unitTestMocker.mockModule(fs, "existsSync", false);
    unitTestMocker.mockModuleImplementation(fs, "writeFileSync", () => {
      throw new Error("Failed to write file");
    });

    await messageContextLogger.logMessage({
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
  });

  it("should cleanup log files", async () => {
    await messageContextLogger.cleanupLogFiles();
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

  it("should log an action result successfully", async () => {
    const action = "testAction";
    const result: MessageIActionResult = { success: true, result: "success" };

    // Mock getContextData to return fresh mockContextData each time
    const freshMockContextData = {
      conversationHistory: [],
      operations: {},
    };
    const updatedContextData = {
      ...freshMockContextData,
      operations: {
        [action]: {
          operationId: action,
          status: "success",
          result: result.result,
        },
      },
    };
    messageContextStoreGetContextDataSpy.mockReturnValue(freshMockContextData);
    messageContextBuilderUpdateOperationResultSpy.mockReturnValue(
      updatedContextData,
    );

    await messageContextLogger.logActionResult(action, result);

    expect(ensureLogDirectoryExistsSpy).toHaveBeenCalled();
    expect(ensureHistoryFileExistsSpy).toHaveBeenCalled();
    expect(fsAppendFileSyncSpy).toHaveBeenCalled();
    expect(messageContextBuilderUpdateOperationResultSpy).toHaveBeenCalledWith(
      action,
      action,
      result.result,
      freshMockContextData,
      result.success,
      undefined,
    );
    expect(messageContextStoreSetContextDataSpy).toHaveBeenCalledWith(
      updatedContextData,
    );
  });

  it("should log an action result with error", async () => {
    const action = "testAction";
    const error = new Error("test error");
    const result: MessageIActionResult = { success: false, error: error };

    // Mock getContextData to return fresh mockContextData each time
    const freshMockContextData = {
      conversationHistory: [],
      operations: {},
    };
    const updatedContextData = {
      ...freshMockContextData,
      operations: {
        [action]: {
          operationId: action,
          status: "failed",
          error: error.message,
        },
      },
    };
    messageContextStoreGetContextDataSpy.mockReturnValue(freshMockContextData);
    messageContextBuilderUpdateOperationResultSpy.mockReturnValue(
      updatedContextData,
    );

    await messageContextLogger.logActionResult(action, result);
    expect(ensureLogDirectoryExistsSpy).toHaveBeenCalled();
    expect(ensureHistoryFileExistsSpy).toHaveBeenCalled();
    expect(fsAppendFileSyncSpy).toHaveBeenCalled();
    expect(messageContextBuilderUpdateOperationResultSpy).toHaveBeenCalledWith(
      action,
      action,
      "",
      freshMockContextData,
      result.success,
      error.message,
    );
    expect(messageContextStoreSetContextDataSpy).toHaveBeenCalledWith(
      updatedContextData,
    );
  });

  it("should log an action result and handle error writing to file", async () => {
    unitTestMocker.mockModuleImplementation(fs, "appendFileSync", () => {
      throw new Error("Failed to write file");
    });
    const action = "testAction";
    const result: MessageIActionResult = { success: true, result: "success" };
    await messageContextLogger.logActionResult(action, result);

    expect(debugLoggerLogSpy).toHaveBeenCalledWith(
      "MessageLogger",
      "Error writing action result to log file",
      expect.objectContaining({
        error: expect.any(Error),
        logDirectory: expect.any(String),
      }),
    );
  });

  it("should update conversation history with system instructions", async () => {
    const messages = [
      { role: "user", content: "hello" },
    ] as IConversationHistoryMessage[];
    const systemInstructions = "system instructions";

    await messageContextLogger.updateConversationHistory(
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

  it("should update conversation history without system instructions", async () => {
    const messages = [
      { role: "user", content: "hello" },
    ] as IConversationHistoryMessage[];
    const systemInstructions = null;
    await messageContextLogger.updateConversationHistory(
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

  it("should handle error when updating conversation history", async () => {
    unitTestMocker.mockModuleImplementation(fs, "writeFileSync", () => {
      throw new Error("Failed to write file");
    });

    const messages = [
      { role: "user", content: "hello" },
    ] as IConversationHistoryMessage[];
    const systemInstructions = "system instructions";
    await messageContextLogger.updateConversationHistory(
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

  it("should get conversation history", async () => {
    const mockHistory = {
      timestamp: new Date().toISOString(),
      messages: [
        { role: "user", content: "hello" },
      ] as IConversationHistoryMessage[],
    };

    unitTestMocker.mockModuleImplementation(fs, "readFileSync", () =>
      JSON.stringify(mockHistory),
    );
    const history = await messageContextLogger.getConversationHistory();

    expect(history).toEqual(mockHistory.messages);
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
        logDirectory: expect.any(String),
      }),
    );
  });

  describe("Concurrent Access and Lock Mechanism", () => {
    it("should handle concurrent log messages correctly", async () => {
      const message1 = { role: "user" as const, content: "test1" };
      const message2 = { role: "user" as const, content: "test2" };

      // Start both operations almost simultaneously
      const promise1 = messageContextLogger.logMessage(message1);
      const promise2 = messageContextLogger.logMessage(message2);

      await Promise.all([promise1, promise2]);

      // Verify both messages were logged
      expect(fsAppendFileSyncSpy).toHaveBeenCalledTimes(2);
      const calls = fsAppendFileSyncSpy.mock.calls;
      expect(calls[0][1]).toContain("test1");
      expect(calls[1][1]).toContain("test2");
    });

    it("should handle concurrent file operations correctly", async () => {
      const messages = [{ role: "user" as const, content: "test" }];
      const systemInstructions = "system test";

      // Start multiple operations that use file operations
      const promise1 = messageContextLogger.updateConversationHistory(
        messages,
        systemInstructions,
      );
      const promise2 = messageContextLogger.cleanupLogFiles();
      const promise3 = messageContextLogger.getConversationHistory();

      await Promise.all([promise1, promise2, promise3]);

      // Verify operations completed
      expect(fsWriteFileSyncSpy).toHaveBeenCalled();
      expect(fsAppendFileSyncSpy).toHaveBeenCalled();
    });

    it("should maintain operation order with locks", async () => {
      const operations: string[] = [];

      // Mock file operations to track order
      unitTestMocker.mockModuleImplementation(fs, "appendFileSync", () => {
        operations.push("append");
      });

      unitTestMocker.mockModuleImplementation(fs, "writeFileSync", () => {
        operations.push("write");
      });

      // Start operations in specific order
      await messageContextLogger.logMessage({ role: "user", content: "test1" });
      await messageContextLogger.cleanupLogFiles();
      await messageContextLogger.logMessage({ role: "user", content: "test2" });

      // Verify operations happened in order
      expect(operations).toEqual(["append", "write", "write", "append"]);
    });
  });

  describe("Error Handling", () => {
    it("should handle lock acquisition failure", async () => {
      // Mock isLogging to simulate locked state
      let attempts = 0;
      Object.defineProperty(messageContextLogger, "isLogging", {
        get: () => {
          attempts++;
          return attempts <= 3; // Return true for first 3 attempts, then false
        },
        set: () => {},
        configurable: true,
      });

      // Use modern timers
      jest.useFakeTimers();
      const setTimeoutSpy = jest.spyOn(global, "setTimeout");

      const logPromise = messageContextLogger.logMessage({
        role: "user",
        content: "test",
      });

      // Advance timers and handle promise
      await Promise.race([
        logPromise,
        new Promise((resolve) => {
          jest.advanceTimersByTime(100); // Advance less time
          resolve(null);
        }),
      ]);

      expect(setTimeoutSpy).toHaveBeenCalled();
      expect(attempts).toBeGreaterThan(1);
    }, 1000); // Add explicit timeout

    it("should release lock even if operation fails", async () => {
      // Track lock state
      let isLocked = false;
      Object.defineProperty(messageContextLogger, "isLogging", {
        get: () => isLocked,
        set: (value) => {
          isLocked = value;
          return value;
        },
        configurable: true,
      });

      // Mock appendFileSync to throw error
      unitTestMocker.mockModuleImplementation(fs, "appendFileSync", () => {
        throw new Error("Operation failed");
      });

      try {
        await messageContextLogger.logMessage({
          role: "user",
          content: "test",
        });
      } catch (error) {
        // Expected error
      }

      // Verify lock was released
      expect(isLocked).toBe(false);

      // Verify we can perform another operation
      await messageContextLogger.cleanupLogFiles();
      expect(fsWriteFileSyncSpy).toHaveBeenCalled();
    });
  });
});
