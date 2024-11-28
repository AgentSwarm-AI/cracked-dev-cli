import { ConversationContext } from "@services/LLM/ConversationContext";
import { MessageContextManager } from "@services/LLM/MessageContextManager";
import { UnitTestMocker } from "@tests/mocks/UnitTestMocker";
import { container } from "tsyringe";

describe("ConversationContext", () => {
  let conversationContext: ConversationContext;
  let mocker: UnitTestMocker;

  beforeEach(() => {
    mocker = new UnitTestMocker();

    // Spy on MessageContextManager methods
    mocker.spyOnPrototypeAndReturn(
      MessageContextManager,
      "getMessages",
      jest.fn().mockReturnValue([]),
    );
    mocker.spyOnPrototypeAndReturn(
      MessageContextManager,
      "addMessage",
      jest.fn(),
    );
    mocker.spyOnPrototypeAndReturn(MessageContextManager, "clear", jest.fn());
    mocker.spyOnPrototypeAndReturn(
      MessageContextManager,
      "setSystemInstructions",
      jest.fn(),
    );
    mocker.spyOnPrototypeAndReturn(
      MessageContextManager,
      "getSystemInstructions",
      jest.fn().mockReturnValue(null), // Ensure it returns null by default
    );
    mocker.spyOnPrototypeAndReturn(
      MessageContextManager,
      "setCurrentModel",
      jest.fn(),
    );
    mocker.spyOnPrototypeAndReturn(
      MessageContextManager,
      "getTotalTokenCount",
      jest.fn().mockReturnValue(0),
    );
    mocker.spyOnPrototypeAndReturn(
      MessageContextManager,
      "cleanupContext",
      jest.fn().mockReturnValue(false),
    );

    // Resolve ConversationContext from the container
    conversationContext = container.resolve(ConversationContext);
  });

  afterEach(() => {
    mocker.clearAllMocks();
    container.clearInstances();
    jest.clearAllMocks();
  });

  describe("setCurrentModel", () => {
    it("should set the current model", async () => {
      await conversationContext.setCurrentModel("gpt-4");
      expect(
        MessageContextManager.prototype.setCurrentModel,
      ).toHaveBeenCalledWith("gpt-4");
    });
  });

  describe("addMessage", () => {
    it("should add a user message", async () => {
      await conversationContext.addMessage("user", "Hello");
      expect(MessageContextManager.prototype.addMessage).toHaveBeenCalledWith(
        "user",
        "Hello",
      );
    });

    it("should add an assistant message", async () => {
      await conversationContext.addMessage("assistant", "Hi there!");
      expect(MessageContextManager.prototype.addMessage).toHaveBeenCalledWith(
        "assistant",
        "Hi there!",
      );
    });

    it("should add a system message", async () => {
      await conversationContext.addMessage("system", "System instruction");
      expect(MessageContextManager.prototype.addMessage).toHaveBeenCalledWith(
        "system",
        "System instruction",
      );
    });

    it("should throw an error if the role is invalid", async () => {
      await expect(conversationContext.addMessage("invalid" as any, "Hello")).rejects.toThrow(
        "Invalid role. Must be 'user', 'assistant', or 'system'.",
      );
    });

    it("should throw an error if the content is empty", async () => {
      await expect(conversationContext.addMessage("user", "")).rejects.toThrow(
        "Content cannot be empty.",
      );
    });
  });

  describe("getMessages", () => {
    it("should return conversation messages", () => {
      const messages = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there!" },
      ];
      (
        MessageContextManager.prototype.getMessages as jest.Mock
      ).mockReturnValue(messages);

      const result = conversationContext.getMessages();
      expect(result).toEqual(messages);
      expect(MessageContextManager.prototype.getMessages).toHaveBeenCalled();
    });
  });

  describe("clear", () => {
    it("should clear the conversation context", () => {
      conversationContext.clear();
      expect(MessageContextManager.prototype.clear).toHaveBeenCalled();
    });
  });

  describe("setSystemInstructions", () => {
    it("should set system instructions", async () => {
      await conversationContext.setSystemInstructions("Be helpful");
      expect(
        MessageContextManager.prototype.setSystemInstructions,
      ).toHaveBeenCalledWith("Be helpful");
    });
  });

  describe("getSystemInstructions", () => {
    it("should return system instructions when set", () => {
      const instructions = "Be helpful";
      (
        MessageContextManager.prototype.getSystemInstructions as jest.Mock
      ).mockReturnValue(instructions);

      const result = conversationContext.getSystemInstructions();
      expect(result).toBe(instructions);
      expect(
        MessageContextManager.prototype.getSystemInstructions,
      ).toHaveBeenCalled();
    });

    it("should return null when no system instructions are set", () => {
      // Ensure the mock explicitly returns null
      (
        MessageContextManager.prototype.getSystemInstructions as jest.Mock
      ).mockReturnValue(null);

      const result = conversationContext.getSystemInstructions();
      expect(result).toBeNull();
      expect(
        MessageContextManager.prototype.getSystemInstructions,
      ).toHaveBeenCalled();
    });
  });

  describe("getTotalTokenCount", () => {
    it("should return the total token count", () => {
      const tokenCount = 100;
      (
        MessageContextManager.prototype.getTotalTokenCount as jest.Mock
      ).mockReturnValue(tokenCount);

      const result = conversationContext.getTotalTokenCount();
      expect(result).toBe(tokenCount);
      expect(
        MessageContextManager.prototype.getTotalTokenCount,
      ).toHaveBeenCalled();
    });
  });

  describe("cleanupContext", () => {
    it("should perform cleanup if context window is exceeded", async () => {
      (
        MessageContextManager.prototype.getTotalTokenCount as jest.Mock
      ).mockReturnValue(2000);
      (
        MessageContextManager.prototype.cleanupContext as jest.Mock
      ).mockReturnValue(true);
      (
        MessageContextManager.prototype.getMessages as jest.Mock
      ).mockReturnValue([
        { role: "user", content: "First message" },
        { role: "assistant", content: "Response to first message" },
      ]);

      const result = await conversationContext.cleanupContext();
      expect(result).toBe(true);
      expect(
        MessageContextManager.prototype.cleanupContext,
      ).toHaveBeenCalled();
    });

    it("should not perform cleanup if context window is not exceeded", async () => {
      (
        MessageContextManager.prototype.getTotalTokenCount as jest.Mock
      ).mockReturnValue(1000);
      (
        MessageContextManager.prototype.cleanupContext as jest.Mock
      ).mockReturnValue(false);

      const result = await conversationContext.cleanupContext();
      expect(result).toBe(false);
      expect(
        MessageContextManager.prototype.cleanupContext,
      ).toHaveBeenCalled();
    });

    it("should preserve system instructions during cleanup", async () => {
      const systemInstructions = "Be helpful";
      (
        MessageContextManager.prototype.getSystemInstructions as jest.Mock
      ).mockReturnValue(systemInstructions);
      (
        MessageContextManager.prototype.getTotalTokenCount as jest.Mock
      ).mockReturnValue(2000);
      (
        MessageContextManager.prototype.cleanupContext as jest.Mock
      ).mockReturnValue(true);
      (
        MessageContextManager.prototype.getMessages as jest.Mock
      ).mockReturnValue([
        { role: "user", content: "First message" },
        { role: "assistant", content: "Response to first message" },
      ]);

      await conversationContext.cleanupContext();

      expect(
        MessageContextManager.prototype.setSystemInstructions,
      ).toHaveBeenCalledWith(systemInstructions);
    });

    it("should preserve the first user message during cleanup", async () => {
      const messages = [
        { role: "user", content: "First message" },
        { role: "assistant", content: "Response to first message" },
        { role: "user", content: "Second message" },
      ];
      (
        MessageContextManager.prototype.getMessages as jest.Mock
      ).mockReturnValue(messages);
      (
        MessageContextManager.prototype.getTotalTokenCount as jest.Mock
      ).mockReturnValue(2000);
      (
        MessageContextManager.prototype.cleanupContext as jest.Mock
      ).mockReturnValue(true);

      await conversationContext.cleanupContext();

      expect(MessageContextManager.prototype.addMessage).toHaveBeenCalledWith(
        "user",
        "First message",
      );
    });
  });
});