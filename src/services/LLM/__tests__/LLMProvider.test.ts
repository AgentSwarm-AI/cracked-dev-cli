// src/services/LLM/__tests__/LLMProvider.test.ts
import { ILLMProvider } from "@services/LLM/ILLMProvider";
import { LLMProvider, LLMProviderType } from "@services/LLM/LLMProvider";
import { MessageContextManager } from "@services/LLM/MessageContextManager";
import { OpenRouterAPI } from "@services/LLMProviders/OpenRouter/OpenRouterAPI";
import { UnitTestMocker } from "@tests/mocks/UnitTestMocker";
import { container } from "tsyringe";

describe("LLMProvider", () => {
  let provider: ILLMProvider;
  let mocker: UnitTestMocker;

  beforeEach(() => {
    mocker = new UnitTestMocker();

    // Mock OpenRouterAPI methods
    mocker.spyOnPrototypeWithImplementation(
      OpenRouterAPI,
      "sendMessage",
      async () => "response",
    );
    mocker.spyOnPrototypeWithImplementation(
      OpenRouterAPI,
      "sendMessageWithContext",
      async () => "response",
    );
    mocker.spyOnPrototypeWithImplementation(
      OpenRouterAPI,
      "clearConversationContext",
      () => {},
    );
    mocker.spyOnPrototypeWithImplementation(
      OpenRouterAPI,
      "getConversationContext",
      () => [],
    );
    mocker.spyOnPrototypeWithImplementation(
      OpenRouterAPI,
      "addSystemInstructions",
      () => {},
    );
    mocker.spyOnPrototypeWithImplementation(
      OpenRouterAPI,
      "getAvailableModels",
      async () => ["model1", "model2"],
    );
    mocker.spyOnPrototypeWithImplementation(
      OpenRouterAPI,
      "validateModel",
      async () => true,
    );
    mocker.spyOnPrototypeWithImplementation(
      OpenRouterAPI,
      "getModelInfo",
      async () => ({}),
    );
    mocker.spyOnPrototypeWithImplementation(
      OpenRouterAPI,
      "streamMessage",
      async () => {},
    );

    // Mock MessageContextManager methods
    mocker.spyOnPrototypeAndReturn(MessageContextManager, "getMessages", []);
    mocker.spyOnPrototypeAndReturn(
      MessageContextManager,
      "addMessage",
      undefined,
    );
    mocker.spyOnPrototypeAndReturn(MessageContextManager, "clear", undefined);
    mocker.spyOnPrototypeAndReturn(
      MessageContextManager,
      "setSystemInstructions",
      undefined,
    );

    // Resolve LLMProvider from the container
    provider = container.resolve(LLMProvider);
  });

  afterEach(() => {
    mocker.clearAllMocks();
    container.clearInstances();
    jest.clearAllMocks();
  });

  describe("getInstance", () => {
    it("should return an instance of OpenRouterAPI for OpenRouter provider type", () => {
      const instance = LLMProvider.getInstance(LLMProviderType.OpenRouter);
      expect(instance).toBeInstanceOf(OpenRouterAPI);
    });

    it("should throw an error if the provider type is not recognized", () => {
      expect(() => {
        LLMProvider.getInstance("unsupported-type" as any);
      }).toThrowError("Unsupported provider type: unsupported-type");
    });
  });

  describe("Delegated Methods", () => {
    it("should delegate sendMessage to the current provider", async () => {
      const response = await provider.sendMessage("model", "message");
      expect(response).toBe("response");
      expect(OpenRouterAPI.prototype.sendMessage).toHaveBeenCalledWith(
        "model",
        "message",
        undefined,
      );
    });

    it("should delegate sendMessageWithContext to the current provider", async () => {
      const response = await provider.sendMessageWithContext(
        "model",
        "message",
        "systemInstructions",
      );
      expect(response).toBe("response");
      expect(
        OpenRouterAPI.prototype.sendMessageWithContext,
      ).toHaveBeenCalledWith(
        "model",
        "message",
        "systemInstructions",
        undefined,
      );
    });

    it("should delegate clearConversationContext to the current provider", () => {
      provider.clearConversationContext();
      expect(
        OpenRouterAPI.prototype.clearConversationContext,
      ).toHaveBeenCalled();
    });

    it("should delegate getConversationContext to the current provider", () => {
      const context = provider.getConversationContext();
      expect(context).toEqual([]);
      expect(OpenRouterAPI.prototype.getConversationContext).toHaveBeenCalled();
    });

    it("should delegate addSystemInstructions to the current provider", () => {
      provider.addSystemInstructions("instructions");
      expect(
        OpenRouterAPI.prototype.addSystemInstructions,
      ).toHaveBeenCalledWith("instructions");
    });

    it("should delegate getAvailableModels to the current provider", async () => {
      const models = await provider.getAvailableModels();
      expect(models).toEqual(["model1", "model2"]);
      expect(OpenRouterAPI.prototype.getAvailableModels).toHaveBeenCalled();
    });

    it("should delegate validateModel to the current provider", async () => {
      const isValid = await provider.validateModel("model");
      expect(isValid).toBe(true);
      expect(OpenRouterAPI.prototype.validateModel).toHaveBeenCalledWith(
        "model",
      );
    });

    it("should delegate getModelInfo to the current provider", async () => {
      const modelInfo = await provider.getModelInfo("model");
      expect(modelInfo).toEqual({});
      expect(OpenRouterAPI.prototype.getModelInfo).toHaveBeenCalledWith(
        "model",
      );
    });

    it("should delegate streamMessage to the current provider", async () => {
      const mockCallback = jest.fn();
      await provider.streamMessage("model", "message", mockCallback);
      expect(OpenRouterAPI.prototype.streamMessage).toHaveBeenCalledWith(
        "model",
        "message",
        mockCallback,
        undefined,
      );
    });

    it("should throw an error when sendMessage is called with an unsupported model", async () => {
      mocker.spyOnPrototypeWithImplementation(
        OpenRouterAPI,
        "sendMessage",
        async () => {
          throw new Error("Model not available");
        },
      );
      mocker.spyOnPrototypeWithImplementation(
        OpenRouterAPI,
        "validateModel",
        async () => false,
      );

      await expect(
        provider.sendMessage("unsupported-model", "message"),
      ).rejects.toThrow("Model not available");
    });

    it("should throw an error when sendMessageWithContext is called with an unsupported model", async () => {
      mocker.spyOnPrototypeWithImplementation(
        OpenRouterAPI,
        "sendMessageWithContext",
        async () => {
          throw new Error("Model not available");
        },
      );
      mocker.spyOnPrototypeWithImplementation(
        OpenRouterAPI,
        "validateModel",
        async () => false,
      );

      await expect(
        provider.sendMessageWithContext(
          "unsupported-model",
          "message",
          "systemInstructions",
        ),
      ).rejects.toThrow("Model not available");
    });
  });
});
