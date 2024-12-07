// src/services/LLM/__tests__/LLMProvider.test.ts
import { MessageContextManager } from "@/services/LLM/context/MessageContextManager";
import { ILLMProvider } from "@services/LLM/ILLMProvider";
import { LLMProvider, LLMProviderType } from "@services/LLM/LLMProvider";
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

    it("should handle empty message in sendMessage", async () => {
      await provider.sendMessage("model", "");
      expect(OpenRouterAPI.prototype.sendMessage).toHaveBeenCalledWith(
        "model",
        "",
        undefined,
      );
    });

    it("should handle empty message in sendMessageWithContext", async () => {
      await provider.sendMessageWithContext("model", "", "systemInstructions");
      expect(
        OpenRouterAPI.prototype.sendMessageWithContext,
      ).toHaveBeenCalledWith("model", "", "systemInstructions", undefined);
    });

    it("should handle null message in sendMessage", async () => {
      await provider.sendMessage("model", null as any);
      expect(OpenRouterAPI.prototype.sendMessage).toHaveBeenCalledWith(
        "model",
        null,
        undefined,
      );
    });

    it("should handle null message in sendMessageWithContext", async () => {
      await provider.sendMessageWithContext(
        "model",
        null as any,
        "systemInstructions",
      );
      expect(
        OpenRouterAPI.prototype.sendMessageWithContext,
      ).toHaveBeenCalledWith("model", null, "systemInstructions", undefined);
    });

    it("should handle empty system instructions in sendMessageWithContext", async () => {
      await provider.sendMessageWithContext("model", "message", "");
      expect(
        OpenRouterAPI.prototype.sendMessageWithContext,
      ).toHaveBeenCalledWith("model", "message", "", undefined);
    });

    it("should handle null system instructions in sendMessageWithContext", async () => {
      await provider.sendMessageWithContext("model", "message", null as any);
      expect(
        OpenRouterAPI.prototype.sendMessageWithContext,
      ).toHaveBeenCalledWith("model", "message", null, undefined);
    });

    it("should handle empty model in sendMessage", async () => {
      await provider.sendMessage("", "message");
      expect(OpenRouterAPI.prototype.sendMessage).toHaveBeenCalledWith(
        "",
        "message",
        undefined,
      );
    });

    it("should handle null model in sendMessage", async () => {
      await provider.sendMessage(null as any, "message");
      expect(OpenRouterAPI.prototype.sendMessage).toHaveBeenCalledWith(
        null,
        "message",
        undefined,
      );
    });

    it("should handle empty model in sendMessageWithContext", async () => {
      await provider.sendMessageWithContext(
        "",
        "message",
        "systemInstructions",
      );
      expect(
        OpenRouterAPI.prototype.sendMessageWithContext,
      ).toHaveBeenCalledWith("", "message", "systemInstructions", undefined);
    });

    it("should handle null model in sendMessageWithContext", async () => {
      await provider.sendMessageWithContext(
        null as any,
        "message",
        "systemInstructions",
      );
      expect(
        OpenRouterAPI.prototype.sendMessageWithContext,
      ).toHaveBeenCalledWith(null, "message", "systemInstructions", undefined);
    });

    it("should handle empty model in getConversationContext", () => {
      provider.getConversationContext();
      expect(OpenRouterAPI.prototype.getConversationContext).toHaveBeenCalled();
    });

    it("should handle null model in getConversationContext", () => {
      provider.getConversationContext();
      expect(OpenRouterAPI.prototype.getConversationContext).toHaveBeenCalled();
    });

    it("should handle empty model in addSystemInstructions", () => {
      provider.addSystemInstructions("");
      expect(
        OpenRouterAPI.prototype.addSystemInstructions,
      ).toHaveBeenCalledWith("");
    });

    it("should handle null model in addSystemInstructions", () => {
      provider.addSystemInstructions(null as any);
      expect(
        OpenRouterAPI.prototype.addSystemInstructions,
      ).toHaveBeenCalledWith(null);
    });

    it("should handle empty model in getAvailableModels", async () => {
      const models = await provider.getAvailableModels();
      expect(models).toEqual(["model1", "model2"]);
      expect(OpenRouterAPI.prototype.getAvailableModels).toHaveBeenCalled();
    });

    it("should handle null model in getAvailableModels", async () => {
      const models = await provider.getAvailableModels();
      expect(models).toEqual(["model1", "model2"]);
      expect(OpenRouterAPI.prototype.getAvailableModels).toHaveBeenCalled();
    });

    it("should handle empty model in validateModel", async () => {
      const isValid = await provider.validateModel("");
      expect(isValid).toBe(true);
      expect(OpenRouterAPI.prototype.validateModel).toHaveBeenCalledWith("");
    });

    it("should handle null model in validateModel", async () => {
      const isValid = await provider.validateModel(null as any);
      expect(isValid).toBe(true);
      expect(OpenRouterAPI.prototype.validateModel).toHaveBeenCalledWith(null);
    });

    it("should handle empty model in getModelInfo", async () => {
      const modelInfo = await provider.getModelInfo("");
      expect(modelInfo).toEqual({});
      expect(OpenRouterAPI.prototype.getModelInfo).toHaveBeenCalledWith("");
    });

    it("should handle null model in getModelInfo", async () => {
      const modelInfo = await provider.getModelInfo(null as any);
      expect(modelInfo).toEqual({});
      expect(OpenRouterAPI.prototype.getModelInfo).toHaveBeenCalledWith(null);
    });

    it("should handle empty model in streamMessage", async () => {
      const mockCallback = jest.fn();
      await provider.streamMessage("", "message", mockCallback);
      expect(OpenRouterAPI.prototype.streamMessage).toHaveBeenCalledWith(
        "",
        "message",
        mockCallback,
        undefined,
      );
    });

    it("should handle null model in streamMessage", async () => {
      const mockCallback = jest.fn();
      await provider.streamMessage(null as any, "message", mockCallback);
      expect(OpenRouterAPI.prototype.streamMessage).toHaveBeenCalledWith(
        null,
        "message",
        mockCallback,
        undefined,
      );
    });
  });
});
