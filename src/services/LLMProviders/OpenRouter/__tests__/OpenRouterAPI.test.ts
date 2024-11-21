import { MessageContextManager } from "@services/LLM/MessageContextManager";
import { ModelScaler } from "@services/LLM/ModelScaler";
import { OpenRouterAPI } from "@services/LLMProviders/OpenRouter/OpenRouterAPI";
import { DebugLogger } from "@services/logging/DebugLogger";
import { HtmlEntityDecoder } from "@services/text/HTMLEntityDecoder";
import { UnitTestMocker } from "@tests/mocks/UnitTestMocker";
import { container } from "tsyringe";

describe("OpenRouterAPI", () => {
  let openRouterAPI: OpenRouterAPI;
  let mocker: UnitTestMocker;

  beforeEach(() => {
    mocker = new UnitTestMocker();

    // Spy on MessageContextManager methods
    mocker.spyOnPrototypeWithImplementation(
      MessageContextManager,
      "getMessages",
      () => [],
    );
    mocker.spyOnPrototypeWithImplementation(
      MessageContextManager,
      "addMessage",
      () => {},
    );
    mocker.spyOnPrototypeWithImplementation(
      MessageContextManager,
      "clear",
      () => {},
    );
    mocker.spyOnPrototypeWithImplementation(
      MessageContextManager,
      "setSystemInstructions",
      () => {},
    );

    // Spy on other dependencies
    mocker.spyOnPrototypeWithImplementation(
      ModelScaler,
      "getCurrentModel",
      () => null,
    );
    mocker.spyOnPrototypeWithImplementation(ModelScaler, "reset", () => {});
    mocker.spyOnPrototypeWithImplementation(
      HtmlEntityDecoder,
      "decode",
      (str) => str,
    );
    mocker.spyOnPrototypeWithImplementation(
      HtmlEntityDecoder,
      "unescapeString",
      (str) => str,
    );
    mocker.spyOnPrototypeWithImplementation(DebugLogger, "log", () => {});

    // Register dependencies in the container
    container.register(MessageContextManager, {
      useClass: MessageContextManager,
    });
    container.register(ModelScaler, { useClass: ModelScaler });
    container.register(HtmlEntityDecoder, { useClass: HtmlEntityDecoder });
    container.register(DebugLogger, { useClass: DebugLogger });
    container.register(OpenRouterAPI, { useClass: OpenRouterAPI });

    // Resolve OpenRouterAPI from the container
    openRouterAPI = container.resolve(OpenRouterAPI);
  });

  afterEach(() => {
    mocker.clearAllMocks();
    container.clearInstances();
    jest.clearAllMocks();
  });

  describe("sendMessage", () => {
    it("should send a message and handle the response", async () => {
      const mockResponse = {
        data: {
          choices: [{ message: { content: "Hello!" } }],
        },
      };

      mocker.spyOnPrototypeWithImplementation(
        MessageContextManager,
        "getMessages",
        () => [],
      );

      jest
        .spyOn(openRouterAPI["httpClient"], "post")
        .mockResolvedValueOnce(mockResponse);

      const response = await openRouterAPI.sendMessage("gpt-4", "Hi");

      expect(response).toBe("Hello!");
      expect(MessageContextManager.prototype.addMessage).toHaveBeenCalledWith(
        "user",
        "Hi",
      );
      expect(MessageContextManager.prototype.addMessage).toHaveBeenCalledWith(
        "assistant",
        "Hello!",
      );
    });

    it("should handle errors appropriately", async () => {
      const error = {
        response: {
          data: {
            error: {
              message: "Test error",
            },
          },
        },
      };

      mocker.spyOnPrototypeWithImplementation(
        MessageContextManager,
        "getMessages",
        () => [],
      );

      jest
        .spyOn(openRouterAPI["httpClient"], "post")
        .mockRejectedValueOnce(error);

      await expect(openRouterAPI.sendMessage("gpt-4", "Hi")).rejects.toThrow(
        "Test error",
      );
    });
  });

  describe("sendMessageWithContext", () => {
    it("should send a message with system instructions", async () => {
      const mockResponse = {
        data: {
          choices: [{ message: { content: "Hello!" } }],
        },
      };

      mocker.spyOnPrototypeWithImplementation(
        MessageContextManager,
        "getMessages",
        () => [],
      );

      jest
        .spyOn(openRouterAPI["httpClient"], "post")
        .mockResolvedValueOnce(mockResponse);

      const response = await openRouterAPI.sendMessageWithContext(
        "gpt-4",
        "Hi",
        "Be helpful",
      );

      expect(response).toBe("Hello!");
      expect(
        MessageContextManager.prototype.setSystemInstructions,
      ).toHaveBeenCalledWith("Be helpful");
    });
  });

  describe("conversation context management", () => {
    it("should clear conversation context", () => {
      openRouterAPI.clearConversationContext();
      expect(MessageContextManager.prototype.clear).toHaveBeenCalled();
      expect(ModelScaler.prototype.reset).toHaveBeenCalled();
    });

    it("should get conversation context", () => {
      const messages = [{ role: "user", content: "Hi" }];
      mocker.spyOnPrototypeWithImplementation(
        MessageContextManager,
        "getMessages",
        () => messages,
      );

      const context = openRouterAPI.getConversationContext();
      expect(context).toEqual(messages);
    });

    it("should add system instructions", () => {
      openRouterAPI.addSystemInstructions("Be helpful");
      expect(
        MessageContextManager.prototype.setSystemInstructions,
      ).toHaveBeenCalledWith("Be helpful");
    });
  });

  describe("model management", () => {
    it("should get available models", async () => {
      const mockResponse = {
        data: {
          data: [{ id: "model1" }, { id: "model2" }],
        },
      };

      jest
        .spyOn(openRouterAPI["httpClient"], "get")
        .mockResolvedValueOnce(mockResponse);

      const models = await openRouterAPI.getAvailableModels();
      expect(models).toEqual(["model1", "model2"]);
    });

    it("should validate model", async () => {
      const mockResponse = {
        data: {
          data: [{ id: "gpt-4" }, { id: "gpt-3.5-turbo" }],
        },
      };

      jest
        .spyOn(openRouterAPI["httpClient"], "get")
        .mockResolvedValueOnce(mockResponse);

      const isValid = await openRouterAPI.validateModel("gpt-4");
      expect(isValid).toBe(true);
    });

    it("should get model info", async () => {
      const mockModelInfo = { id: "gpt-4", context_length: 8192 };
      const mockResponse = {
        data: {
          data: [mockModelInfo],
        },
      };

      jest
        .spyOn(openRouterAPI["httpClient"], "get")
        .mockResolvedValueOnce(mockResponse);

      const modelInfo = await openRouterAPI.getModelInfo("gpt-4");
      expect(modelInfo).toEqual(mockModelInfo);
    });
  });

  describe("streaming", () => {
    it("should handle streaming messages", async () => {
      const mockStream = {
        data: [
          Buffer.from('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n'),
          Buffer.from('data: {"choices":[{"delta":{"content":"!"}}]}\n\n'),
          Buffer.from("data: [DONE]\n\n"),
        ],
      };

      mocker.spyOnPrototypeWithImplementation(
        MessageContextManager,
        "getMessages",
        () => [],
      );

      jest
        .spyOn(openRouterAPI["httpClient"], "post")
        .mockResolvedValueOnce(mockStream);

      const mockCallback = jest.fn();
      await openRouterAPI.streamMessage("gpt-4", "Hi", mockCallback);

      expect(mockCallback).toHaveBeenCalledWith("Hello");
      expect(mockCallback).toHaveBeenCalledWith("!");
      expect(MessageContextManager.prototype.addMessage).toHaveBeenCalledWith(
        "user",
        "Hi",
      );
      expect(MessageContextManager.prototype.addMessage).toHaveBeenCalledWith(
        "assistant",
        "Hello!",
      );
    });
  });
});
