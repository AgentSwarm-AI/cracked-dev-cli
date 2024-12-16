import { DebugLogger } from "@services/logging/DebugLogger";
import { container } from "tsyringe";
import { UnitTestMocker } from "../../../../jest/mocks/UnitTestMocker";
import { ModelInfo } from "../../ModelInfo";
import { MessageContextBuilder } from "../MessageContextBuilder";
import { MessageContextCleaner } from "../MessageContextCleanup";
import { MessageContextHistory } from "../MessageContextHistory";
import { MessageContextStore } from "../MessageContextStore";

describe("MessageContextCleaner", () => {
  let contextCleaner: MessageContextCleaner;
  let debugLogger: DebugLogger;
  let modelInfo: ModelInfo;
  let messageContextStore: MessageContextStore;
  let messageContextBuilder: MessageContextBuilder;
  let messageContextHistory: MessageContextHistory;
  let mocker: any;
  let unitTestMocker: UnitTestMocker;

  beforeEach(() => {
    debugLogger = container.resolve(DebugLogger);
    modelInfo = container.resolve(ModelInfo);
    messageContextStore = container.resolve(MessageContextStore);
    messageContextBuilder = container.resolve(MessageContextBuilder);
    messageContextHistory = container.resolve(MessageContextHistory);

    contextCleaner = new MessageContextCleaner(
      debugLogger,
      modelInfo,
      messageContextStore,
      messageContextBuilder,
      messageContextHistory,
    );

    unitTestMocker = new UnitTestMocker();
    mocker = {
      spyOn: jest.spyOn,
    };

    // Mock dependencies
    mocker.spyOn(debugLogger, "log").mockImplementation(() => {});
    mocker
      .spyOn(modelInfo, "getCurrentModelContextLength")
      .mockResolvedValue(1000);
    mocker.spyOn(modelInfo, "logCurrentModelUsage").mockResolvedValue();
    mocker
      .spyOn(messageContextStore, "estimateTokenCount")
      .mockImplementation((text: string) => text.length);
    mocker
      .spyOn(messageContextStore, "getTotalTokenCount")
      .mockReturnValue(500);
    mocker
      .spyOn(messageContextHistory, "mergeConversationHistory")
      .mockResolvedValue();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("cleanupContext", () => {
    it("should return false when no cleanup is needed", async () => {
      const mockContextData = {
        conversationHistory: ["short message"],
      };

      mocker
        .spyOn(messageContextStore, "getContextData")
        .mockReturnValue(mockContextData);
      mocker
        .spyOn(messageContextBuilder, "getMessageContext")
        .mockReturnValue([{ role: "user", content: "short message" }]);

      const result = await contextCleaner.cleanupContext();

      expect(result).toBe(false);
      expect(
        messageContextHistory.mergeConversationHistory,
      ).not.toHaveBeenCalled();
    });

    it("should clean up context when token count exceeds limit", async () => {
      const mockContextData = {
        conversationHistory: [
          "long message 1",
          "long message 2",
          "long message 3",
        ],
      };

      mocker
        .spyOn(messageContextStore, "getContextData")
        .mockReturnValue(mockContextData);
      mocker.spyOn(messageContextBuilder, "getMessageContext").mockReturnValue([
        { role: "user", content: "long message 1" },
        { role: "assistant", content: "long message 2" },
        { role: "user", content: "long message 3" },
      ]);

      // Mock estimateTokenCount to return high values
      mocker
        .spyOn(messageContextStore, "estimateTokenCount")
        .mockImplementation(() => 400);

      const result = await contextCleaner.cleanupContext();

      expect(result).toBe(true);
      expect(messageContextHistory.mergeConversationHistory).toHaveBeenCalled();
      expect(debugLogger.log).toHaveBeenCalledWith(
        "Context",
        "Context cleanup performed",
        expect.any(Object),
      );
      expect(modelInfo.logCurrentModelUsage).toHaveBeenCalled();
    });

    it("should handle empty context data", async () => {
      const mockContextData = {
        conversationHistory: [],
      };

      mocker
        .spyOn(messageContextStore, "getContextData")
        .mockReturnValue(mockContextData);
      mocker
        .spyOn(messageContextBuilder, "getMessageContext")
        .mockReturnValue([]);

      const result = await contextCleaner.cleanupContext();

      expect(result).toBe(false);
      expect(
        messageContextHistory.mergeConversationHistory,
      ).not.toHaveBeenCalled();
    });

    it("should remove oldest messages until token count is within limit", async () => {
      const mockContextData = {
        conversationHistory: ["msg1", "msg2", "msg3", "msg4"],
      };

      const messages = [
        { role: "user", content: "msg1" },
        { role: "assistant", content: "msg2" },
        { role: "user", content: "msg3" },
        { role: "assistant", content: "msg4" },
      ];

      mocker
        .spyOn(messageContextStore, "getContextData")
        .mockReturnValue(mockContextData);
      mocker
        .spyOn(messageContextBuilder, "getMessageContext")
        .mockReturnValue(messages);

      // Mock token count to be high for first two messages
      mocker
        .spyOn(messageContextStore, "estimateTokenCount")
        .mockImplementationOnce(() => 600) // msg1
        .mockImplementationOnce(() => 500) // msg2
        .mockImplementationOnce(() => 100) // msg3
        .mockImplementationOnce(() => 100); // msg4

      const result = await contextCleaner.cleanupContext();

      expect(result).toBe(true);
      expect(messageContextHistory.mergeConversationHistory).toHaveBeenCalled();
      expect(debugLogger.log).toHaveBeenCalledWith(
        "Context",
        "Context cleanup performed",
        expect.objectContaining({
          removedMessages: expect.any(Number),
        }),
      );
    });
  });
});
