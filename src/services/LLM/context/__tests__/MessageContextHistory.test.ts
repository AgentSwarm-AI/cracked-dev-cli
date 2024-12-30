import { IConversationHistoryMessage } from "@services/LLM/ILLMProvider";
import { container } from "tsyringe";
import { UnitTestMocker } from "../../../../jest/mocks/UnitTestMocker";
import { PhaseManager } from "../../PhaseManager";
import { Phase } from "../../types/PhaseTypes";
import { MessageContextBuilder } from "../MessageContextBuilder";
import { MessageContextHistory } from "../MessageContextHistory";
import { MessageContextLogger } from "../MessageContextLogger";
import {
  IMessageContextData,
  MessageContextStore,
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

  describe("addMessage", () => {
    it("should throw an error if role is invalid", () => {
      expect(() =>
        messageContextHistory.addMessage("invalid" as any, "Test Message"),
      ).toThrowError("Invalid role: invalid");
    });

    it("should return false if content is empty", () => {
      const result = messageContextHistory.addMessage("user", "  ");
      expect(result).toBe(false);
    });

    it("should return false if content is empty after cleaning", () => {
      const result = messageContextHistory.addMessage(
        "user",
        "<phase_prompt>some prompt</phase_prompt>",
      );
      expect(result).toBe(false);
    });

    it("should return false for duplicate messages", () => {
      const content = "Hello world";

      // Add first message
      const firstResult = messageContextHistory.addMessage("user", content);
      expect(firstResult).toBe(true);

      // Try to add the same message again
      const secondResult = messageContextHistory.addMessage("user", content);
      expect(secondResult).toBe(false);
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
