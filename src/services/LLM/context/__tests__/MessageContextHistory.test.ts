import { IConversationHistoryMessage } from "@services/LLM/ILLMProvider";
import { container } from "tsyringe";
import { UnitTestMocker } from "../../../../jest/mocks/UnitTestMocker";
import { PhaseManager } from "../../PhaseManager";
import { Phase } from "../../types/PhaseTypes";
import { MessageContextBuilder } from "../MessageContextBuilder";
import { MessageContextHistory } from "../MessageContextHistory";
import {
  MessageContextLogger,
  MessageIActionResult,
} from "../MessageContextLogger";
import {
  IMessageContextData,
  MessageCommandOperation,
  MessageContextStore,
  MessageFileOperation,
} from "../MessageContextStore";

const mockMessageContextData = (
  overrides: Partial<IMessageContextData> = {},
): IMessageContextData => {
  return {
    conversationHistory: [],
    fileOperations: new Map(),
    commandOperations: new Map(),
    phaseInstructions: new Map(),
    systemInstructions: null,
    ...overrides,
  };
};

describe("MessageContextHistory", () => {
  let unitTestMocker: UnitTestMocker;
  let messageContextHistory: MessageContextHistory;
  let messageContextStoreMock: MessageContextStore;
  let messageContextBuilderMock: MessageContextBuilder;
  let messageContextLoggerMock: MessageContextLogger;
  let phaseManagerMock: PhaseManager;

  let messageContextGetContextDataSpy: jest.SpyInstance;
  let messageContextSetContextDataSpy: jest.SpyInstance;

  beforeEach(() => {
    unitTestMocker = new UnitTestMocker();

    messageContextHistory = container.resolve(MessageContextHistory);
    messageContextStoreMock = container.resolve(MessageContextStore);
    messageContextBuilderMock = container.resolve(MessageContextBuilder);
    messageContextLoggerMock = container.resolve(MessageContextLogger);
    phaseManagerMock = container.resolve(PhaseManager);

    messageContextGetContextDataSpy = unitTestMocker.spyPrototype(
      MessageContextStore,
      "getContextData",
    );
    messageContextSetContextDataSpy = unitTestMocker.spyPrototype(
      MessageContextStore,
      "setContextData",
    );
  });

  afterEach(() => {
    unitTestMocker.clearAllMocks();
    jest.clearAllMocks();
  });

  describe("mergeConversationHistory", () => {
    it("should not merge if history is empty", () => {
      messageContextGetContextDataSpy.mockReturnValue(
        mockMessageContextData({ conversationHistory: [] }),
      );

      messageContextHistory.mergeConversationHistory();
      expect(messageContextGetContextDataSpy).toHaveBeenCalled();
      expect(messageContextSetContextDataSpy).not.toHaveBeenCalled();
    });

    it("should merge conversation history into a single assistant message", () => {
      const history: IConversationHistoryMessage[] = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there!" },
      ];
      messageContextGetContextDataSpy.mockReturnValue(
        mockMessageContextData({ conversationHistory: history }),
      );
      const addMessageSpy = unitTestMocker
        .spyPrototype(MessageContextHistory, "addMessage")
        .mockReturnValue(true);

      messageContextHistory.mergeConversationHistory();

      expect(addMessageSpy).toHaveBeenCalledWith(
        "assistant",
        "user: Hello\n\nassistant: Hi there!",
        false,
      );
      expect(messageContextSetContextDataSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationHistory: [],
          phaseInstructions: new Map(),
        }),
      );
    });
  });

  describe("addMessage", () => {
    it("should throw an error if role is invalid", () => {
      expect(() =>
        messageContextHistory.addMessage("invalid" as any, "Test Message"),
      ).toThrowError("Invalid role: invalid");
    });

    it("should throw an error if content is empty", () => {
      expect(() => messageContextHistory.addMessage("user", "  ")).toThrowError(
        "Content cannot be empty",
      );
    });

    it("should build message context and store it", () => {
      const mockContextData = mockMessageContextData();
      const mockUpdatedContextData = mockMessageContextData({
        conversationHistory: [{ role: "user", content: "Test Message" }],
      });

      messageContextGetContextDataSpy.mockReturnValue(mockContextData);
      const buildMessageContextSpy = unitTestMocker
        .spyPrototype(MessageContextBuilder, "buildMessageContext")
        .mockReturnValue(mockUpdatedContextData);

      const logMessageSpy = unitTestMocker.spyPrototype(
        MessageContextHistory,
        "logMessage" as any,
      );

      unitTestMocker
        .spyPrototype(PhaseManager, "getCurrentPhase")
        .mockReturnValue(Phase.Discovery);

      const result = messageContextHistory.addMessage("user", "Test Message");

      expect(buildMessageContextSpy).toHaveBeenCalledWith(
        "user",
        "Test Message",
        Phase.Discovery,
        mockContextData,
      );
      expect(messageContextSetContextDataSpy).toHaveBeenCalledWith(
        mockUpdatedContextData,
      );
      expect(logMessageSpy).toHaveBeenCalledWith({
        role: "user",
        content: "Test Message",
      });
      expect(result).toBe(true);
    });

    it("should skip logging if log parameter is set to false", () => {
      const mockContextData = mockMessageContextData();
      const mockUpdatedContextData = mockMessageContextData({
        conversationHistory: [{ role: "user", content: "Test Message" }],
      });

      messageContextGetContextDataSpy.mockReturnValue(mockContextData);
      const buildMessageContextSpy = unitTestMocker
        .spyPrototype(MessageContextBuilder, "buildMessageContext")
        .mockReturnValue(mockUpdatedContextData);
      const logMessageSpy = unitTestMocker.spyPrototype(
        MessageContextHistory,
        "logMessage" as any,
      );
      unitTestMocker
        .spyPrototype(PhaseManager, "getCurrentPhase")
        .mockReturnValue(Phase.Discovery);

      messageContextHistory.addMessage("user", "Test Message", false);

      expect(logMessageSpy).not.toHaveBeenCalled();
    });
  });

  describe("logMessage", () => {
    it("should not log if NODE_ENV is test", () => {
      unitTestMocker
        .spyPrototype(MessageContextHistory, "isLoggingEnabled" as any)
        .mockReturnValue(true);
      process.env.NODE_ENV = "test";
      const logMessageSpy = unitTestMocker.spyPrototype(
        MessageContextLogger,
        "logMessage",
      );

      messageContextHistory["logMessage"]({
        role: "user",
        content: "Test Message",
      });
      expect(logMessageSpy).not.toHaveBeenCalled();
      process.env.NODE_ENV = "development";
    });

    it("should not log if logging is disabled", () => {
      unitTestMocker
        .spyPrototype(MessageContextHistory, "isLoggingEnabled" as any)
        .mockReturnValue(false);
      const logMessageSpy = unitTestMocker.spyPrototype(
        MessageContextLogger,
        "logMessage",
      );

      messageContextHistory["logMessage"]({
        role: "user",
        content: "Test Message",
      });
      expect(logMessageSpy).not.toHaveBeenCalled();
    });

    it("should log the message if logging is enabled", () => {
      unitTestMocker
        .spyPrototype(MessageContextHistory, "isLoggingEnabled" as any)
        .mockReturnValue(true);
      const logMessageSpy = unitTestMocker.spyPrototype(
        MessageContextLogger,
        "logMessage",
      );

      const message: IConversationHistoryMessage = {
        role: "user",
        content: "Test Message",
      };
      messageContextHistory["logMessage"](message);
      expect(logMessageSpy).toHaveBeenCalledWith(message);
    });
  });

  describe("logActionResult", () => {
    it("should not log if NODE_ENV is test", () => {
      unitTestMocker
        .spyPrototype(MessageContextHistory, "isLoggingEnabled" as any)
        .mockReturnValue(true);
      process.env.NODE_ENV = "test";
      const logActionResultSpy = unitTestMocker.spyPrototype(
        MessageContextLogger,
        "logActionResult",
      );

      messageContextHistory.logActionResult("test_action", {
        success: true,
        result: "success",
      });
      expect(logActionResultSpy).not.toHaveBeenCalled();
      process.env.NODE_ENV = "development";
    });

    it("should not log if logging is disabled", () => {
      unitTestMocker
        .spyPrototype(MessageContextHistory, "isLoggingEnabled" as any)
        .mockReturnValue(false);
      const logActionResultSpy = unitTestMocker.spyPrototype(
        MessageContextLogger,
        "logActionResult",
      );

      messageContextHistory.logActionResult("test_action", {
        success: true,
        result: "success",
      });
      expect(logActionResultSpy).not.toHaveBeenCalled();
    });

    it("should log the action result if logging is enabled", () => {
      unitTestMocker
        .spyPrototype(MessageContextHistory, "isLoggingEnabled" as any)
        .mockReturnValue(true);
      const logActionResultSpy = unitTestMocker.spyPrototype(
        MessageContextLogger,
        "logActionResult",
      );

      const action = "test_action";
      const result: MessageIActionResult = { success: true, result: "success" };
      messageContextHistory.logActionResult(action, result);
      expect(logActionResultSpy).toHaveBeenCalledWith(action, result);
    });
  });

  describe("updateMessageContextWithOperationResult", () => {
    it("should update context with read_file operation result", () => {
      const mockContextData = mockMessageContextData();
      const mockUpdatedContextData = mockMessageContextData({
        fileOperations: new Map([
          [
            "test-file.txt",
            {
              type: "read_file",
              path: "test-file.txt",
              content: "file content",
              success: true,
              timestamp: expect.any(Number),
            } as MessageFileOperation,
          ],
        ]),
      });

      messageContextGetContextDataSpy.mockReturnValue(mockContextData);
      const updateOperationResultSpy = unitTestMocker
        .spyPrototype(MessageContextBuilder, "updateOperationResult")
        .mockReturnValue(mockUpdatedContextData);

      messageContextHistory.updateMessageContextWithOperationResult(
        "read_file: test-file.txt",
        "file content",
      );

      expect(updateOperationResultSpy).toHaveBeenCalledWith(
        "read_file",
        "test-file.txt",
        "file content",
        mockContextData,
        undefined,
        undefined,
      );
      expect(messageContextSetContextDataSpy).toHaveBeenCalledWith(
        mockUpdatedContextData,
      );
    });

    it("should update context with write_file operation result", () => {
      const mockContextData = mockMessageContextData();
      const mockUpdatedContextData = mockMessageContextData({
        fileOperations: new Map([
          [
            "test-file.txt",
            {
              type: "write_file",
              path: "test-file.txt",
              content: "file content",
              success: true,
              timestamp: expect.any(Number),
            } as MessageFileOperation,
          ],
        ]),
      });

      messageContextGetContextDataSpy.mockReturnValue(mockContextData);
      const updateOperationResultSpy = unitTestMocker
        .spyPrototype(MessageContextBuilder, "updateOperationResult")
        .mockReturnValue(mockUpdatedContextData);

      messageContextHistory.updateMessageContextWithOperationResult(
        "write_file: test-file.txt",
        "file content",
      );

      expect(updateOperationResultSpy).toHaveBeenCalledWith(
        "write_file",
        "test-file.txt",
        "file content",
        mockContextData,
        undefined,
        undefined,
      );
      expect(messageContextSetContextDataSpy).toHaveBeenCalledWith(
        mockUpdatedContextData,
      );
    });

    it("should update context with execute_command operation result", () => {
      const mockContextData = mockMessageContextData();
      const mockUpdatedContextData = mockMessageContextData({
        commandOperations: new Map([
          [
            "ls -l",
            {
              type: "execute_command",
              command: "ls -l",
              output: "command output",
              success: true,
              timestamp: expect.any(Number),
            } as MessageCommandOperation,
          ],
        ]),
      });

      messageContextGetContextDataSpy.mockReturnValue(mockContextData);
      const updateOperationResultSpy = unitTestMocker
        .spyPrototype(MessageContextBuilder, "updateOperationResult")
        .mockReturnValue(mockUpdatedContextData);

      messageContextHistory.updateMessageContextWithOperationResult(
        "execute_command: ls -l",
        "command output",
      );

      expect(updateOperationResultSpy).toHaveBeenCalledWith(
        "execute_command",
        "ls -l",
        "command output",
        mockContextData,
        undefined,
        undefined,
      );
      expect(messageContextSetContextDataSpy).toHaveBeenCalledWith(
        mockUpdatedContextData,
      );
    });
  });

  describe("getMessages", () => {
    it("should return message context from MessageContextBuilder", () => {
      const mockContextData = mockMessageContextData();
      const mockMessages: IConversationHistoryMessage[] = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi" },
      ];
      messageContextGetContextDataSpy.mockReturnValue(mockContextData);
      const getMessageContextSpy = unitTestMocker
        .spyPrototype(MessageContextBuilder, "getMessageContext")
        .mockReturnValue(mockMessages);

      const result = messageContextHistory.getMessages();

      expect(getMessageContextSpy).toHaveBeenCalledWith(mockContextData);
      expect(result).toEqual(mockMessages);
    });
  });

  describe("clear", () => {
    it("should clear the store and cleanup log files", () => {
      const clearSpy = unitTestMocker.spyPrototype(
        MessageContextStore,
        "clear",
      );
      const cleanupLogFilesSpy = unitTestMocker.spyPrototype(
        MessageContextLogger,
        "cleanupLogFiles",
      );

      messageContextHistory.clear();

      expect(clearSpy).toHaveBeenCalled();
      expect(cleanupLogFilesSpy).toHaveBeenCalled();
    });
  });

  describe("setSystemInstructions", () => {
    it("should set system instructions in the store", () => {
      messageContextGetContextDataSpy.mockReturnValue(mockMessageContextData());

      messageContextHistory.setSystemInstructions("Test instructions");
      expect(messageContextSetContextDataSpy).toHaveBeenCalledWith({
        systemInstructions: "Test instructions",
      });
    });
  });

  describe("getSystemInstructions", () => {
    it("should get system instructions from the store", () => {
      messageContextGetContextDataSpy.mockReturnValue(
        mockMessageContextData({ systemInstructions: "Test instructions" }),
      );
      const result = messageContextHistory.getSystemInstructions();
      expect(result).toBe("Test instructions");
    });
  });

  describe("updateLogFile", () => {
    it("should not update log file if NODE_ENV is test", () => {
      unitTestMocker
        .spyPrototype(MessageContextHistory, "isLoggingEnabled" as any)
        .mockReturnValue(true);
      process.env.NODE_ENV = "test";
      messageContextGetContextDataSpy.mockReturnValue(
        mockMessageContextData({
          systemInstructions: "system instructions",
        }),
      );
      const updateConversationHistorySpy = unitTestMocker.spyPrototype(
        MessageContextLogger,
        "updateConversationHistory",
      );
      unitTestMocker.spyPrototype(MessageContextBuilder, "getMessageContext");

      messageContextHistory.updateLogFile();
      expect(updateConversationHistorySpy).not.toHaveBeenCalled();
      process.env.NODE_ENV = "development";
    });

    it("should not update log file if logging is disabled", () => {
      unitTestMocker
        .spyPrototype(MessageContextHistory, "isLoggingEnabled" as any)
        .mockReturnValue(false);
      messageContextGetContextDataSpy.mockReturnValue(
        mockMessageContextData({
          systemInstructions: "system instructions",
        }),
      );
      const updateConversationHistorySpy = unitTestMocker.spyPrototype(
        MessageContextLogger,
        "updateConversationHistory",
      );
      unitTestMocker.spyPrototype(MessageContextBuilder, "getMessageContext");

      messageContextHistory.updateLogFile();
      expect(updateConversationHistorySpy).not.toHaveBeenCalled();
    });

    it("should update log file if logging is enabled", () => {
      const mockMessages: IConversationHistoryMessage[] = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi" },
      ];
      unitTestMocker
        .spyPrototype(MessageContextHistory, "isLoggingEnabled" as any)
        .mockReturnValue(true);
      messageContextGetContextDataSpy.mockReturnValue(
        mockMessageContextData({
          systemInstructions: "system instructions",
        }),
      );
      const getMessageContextSpy = unitTestMocker
        .spyPrototype(MessageContextBuilder, "getMessageContext")
        .mockReturnValue(mockMessages);
      const updateConversationHistorySpy = unitTestMocker.spyPrototype(
        MessageContextLogger,
        "updateConversationHistory",
      );

      messageContextHistory.updateLogFile();

      expect(updateConversationHistorySpy).toHaveBeenCalledWith(
        mockMessages,
        "system instructions",
      );
    });
  });
});
