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
    mocker.spyOnPrototype(
      MessageContextManager,
      "getMessages",
      jest.fn().mockReturnValue([]),
    );
    mocker.spyOnPrototype(MessageContextManager, "addMessage", jest.fn());
    mocker.spyOnPrototype(MessageContextManager, "clear", jest.fn());
    mocker.spyOnPrototype(
      MessageContextManager,
      "setSystemInstructions",
      jest.fn(),
    );
    mocker.spyOnPrototype(
      MessageContextManager,
      "getSystemInstructions",
      jest.fn().mockReturnValue(null), // Ensure it returns null by default
    );
    mocker.spyOnPrototype(MessageContextManager, "setCurrentModel", jest.fn());

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
});
