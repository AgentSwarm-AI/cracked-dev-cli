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
      expect(result).toBe(true);
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
    it("should clear the store", () => {
      const clearSpy = unitTestMocker.spyPrototype(
        MessageContextStore,
        "clear",
      );

      messageContextHistory.clear();

      expect(clearSpy).toHaveBeenCalled();
    });
  });

  describe("setSystemInstructions", () => {
    it("should set system instructions in the store", () => {
      messageContextGetContextDataSpy.mockReturnValue(mockMessageContextData());

      messageContextHistory.setSystemInstructions("Test instructions");

      expect(messageContextSetContextDataSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          systemInstructions: "Test instructions",
        }),
      );
    });
  });

  describe("getSystemInstructions", () => {
    it("should return system instructions from the store", () => {
      const mockData = mockMessageContextData({
        systemInstructions: "Test instructions",
      });
      messageContextGetContextDataSpy.mockReturnValue(mockData);

      const result = messageContextHistory.getSystemInstructions();

      expect(result).toBe("Test instructions");
    });
  });
});
