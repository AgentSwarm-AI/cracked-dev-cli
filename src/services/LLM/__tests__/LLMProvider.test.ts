// src/services/LLM/__tests__/LLMProvider.test.ts
import { ConversationContext } from "@services/LLM/ConversationContext";
import { ILLMProvider } from "@services/LLM/ILLMProvider";
import { LLMProvider, LLMProviderType } from "@services/LLM/LLMProvider";
import { ModelScaler } from "@services/LLM/ModelScaler";
import { OpenRouterAPI } from "@services/LLMProviders/OpenRouter/OpenRouterAPI";
import { DebugLogger } from "@services/logging/DebugLogger";
import { HtmlEntityDecoder } from "@services/text/HTMLEntityDecoder";
import { UnitTestMocker } from "@tests/mocks/UnitTestMocker";
import { container } from "tsyringe";

describe("LLMProvider", () => {
  let provider: ILLMProvider;
  let mocker: UnitTestMocker;

  // Mocked Instances
  let mockOpenRouterAPI: jest.Mocked<OpenRouterAPI>;
  let mockConversationContext: jest.Mocked<ConversationContext>;
  let mockHtmlEntityDecoder: jest.Mocked<HtmlEntityDecoder>;
  let mockModelScaler: jest.Mocked<ModelScaler>;
  let mockDebugLogger: jest.Mocked<DebugLogger>;

  beforeAll(() => {
    // Initialize UnitTestMocker
    mocker = new UnitTestMocker();

    // Instantiate mocked dependencies
    mockConversationContext =
      new ConversationContext() as jest.Mocked<ConversationContext>;
    mockHtmlEntityDecoder =
      new HtmlEntityDecoder() as jest.Mocked<HtmlEntityDecoder>;
    mockDebugLogger = new DebugLogger() as jest.Mocked<DebugLogger>;
    mockModelScaler = new ModelScaler(
      mockDebugLogger,
    ) as jest.Mocked<ModelScaler>;
    mockOpenRouterAPI = new OpenRouterAPI(
      mockConversationContext,
      mockHtmlEntityDecoder,
      mockModelScaler,
      mockDebugLogger,
    ) as jest.Mocked<OpenRouterAPI>;

    // Set up mock implementations
    mockOpenRouterAPI.sendMessage = jest.fn().mockResolvedValue("response");
    mockOpenRouterAPI.sendMessageWithContext = jest
      .fn()
      .mockResolvedValue("response");
    mockOpenRouterAPI.clearConversationContext = jest.fn();
    mockOpenRouterAPI.getConversationContext = jest.fn().mockReturnValue([]);
    mockOpenRouterAPI.addSystemInstructions = jest.fn();
    mockOpenRouterAPI.getAvailableModels = jest
      .fn()
      .mockResolvedValue(["model1", "model2"]);
    mockOpenRouterAPI.validateModel = jest.fn().mockResolvedValue(true);
    mockOpenRouterAPI.getModelInfo = jest.fn().mockResolvedValue({});
    mockOpenRouterAPI.streamMessage = jest.fn().mockResolvedValue(undefined);

    // Spy on prototype methods using UnitTestMocker
    mocker.spyOnPrototype(
      ConversationContext,
      "setSystemInstructions",
      jest.fn(),
    );
    mocker.spyOnPrototype(
      ConversationContext,
      "getSystemInstructions",
      jest.fn().mockReturnValue(null),
    );
    mocker.spyOnPrototype(
      ConversationContext,
      "getMessages",
      jest.fn().mockReturnValue([]),
    );
    mocker.spyOnPrototype(ConversationContext, "clear", jest.fn());
    mocker.spyOnPrototype(ConversationContext, "addMessage", jest.fn());

    mocker.spyOnPrototype(DebugLogger, "log", jest.fn());

    mocker.spyOnPrototype(
      ModelScaler,
      "getCurrentModel",
      jest.fn().mockReturnValue("model1"),
    );
    mocker.spyOnPrototype(ModelScaler, "reset", jest.fn());

    // Register mocked instances with tsyringe container
    container.registerInstance(ConversationContext, mockConversationContext);
    container.registerInstance(HtmlEntityDecoder, mockHtmlEntityDecoder);
    container.registerInstance(ModelScaler, mockModelScaler);
    container.registerInstance(DebugLogger, mockDebugLogger);
    container.registerInstance(OpenRouterAPI, mockOpenRouterAPI);

    // Register LLMProvider in the container
    container.register(LLMProvider, { useClass: LLMProvider });

    // Resolve LLMProvider from the container
    provider = container.resolve(LLMProvider);
  });

  afterAll(() => {
    // Clear all mocks after all tests
    mocker.clearAllMocks();
    jest.resetAllMocks();
  });

  describe("getInstance", () => {
    it("should return an instance of OpenRouterAPI for OpenRouter provider type", () => {
      const instance = LLMProvider.getInstance(LLMProviderType.OpenRouter);
      expect(instance).toBe(mockOpenRouterAPI);
    });

    it("should throw an error if the provider type is not recognized", () => {
      expect(() => {
        LLMProvider.getInstance("unsupported-type" as any);
      }).toThrowError("Unsupported provider type: unsupported-type");
    });
  });

  describe("Delegated Methods", () => {
    beforeEach(() => {
      // Ensure provider uses the OpenRouterAPI mock
      provider = LLMProvider.getInstance(LLMProviderType.OpenRouter);
    });

    it("should delegate sendMessage to the current provider", async () => {
      const response = await provider.sendMessage("model", "message");
      expect(response).toBe("response");
      expect(mockOpenRouterAPI.sendMessage).toHaveBeenCalledWith(
        "model",
        "message",
      );
    });

    it("should delegate sendMessageWithContext to the current provider", async () => {
      const response = await provider.sendMessageWithContext(
        "model",
        "message",
        "systemInstructions",
      );
      expect(response).toBe("response");
      expect(mockOpenRouterAPI.sendMessageWithContext).toHaveBeenCalledWith(
        "model",
        "message",
        "systemInstructions",
      );
    });

    it("should delegate clearConversationContext to the current provider", () => {
      provider.clearConversationContext();
      expect(mockOpenRouterAPI.clearConversationContext).toHaveBeenCalled();
    });

    it("should delegate getConversationContext to the current provider", () => {
      const context = provider.getConversationContext();
      expect(context).toEqual([]);
      expect(mockOpenRouterAPI.getConversationContext).toHaveBeenCalled();
    });

    it("should delegate addSystemInstructions to the current provider", () => {
      provider.addSystemInstructions("instructions");
      expect(mockOpenRouterAPI.addSystemInstructions).toHaveBeenCalledWith(
        "instructions",
      );
    });

    it("should delegate getAvailableModels to the current provider", async () => {
      const models = await provider.getAvailableModels();
      expect(models).toEqual(["model1", "model2"]);
      expect(mockOpenRouterAPI.getAvailableModels).toHaveBeenCalled();
    });

    it("should delegate validateModel to the current provider", async () => {
      const isValid = await provider.validateModel("model");
      expect(isValid).toBe(true);
      expect(mockOpenRouterAPI.validateModel).toHaveBeenCalledWith("model");
    });

    it("should delegate getModelInfo to the current provider", async () => {
      const modelInfo = await provider.getModelInfo("model");
      expect(modelInfo).toEqual({});
      expect(mockOpenRouterAPI.getModelInfo).toHaveBeenCalledWith("model");
    });

    it("should delegate streamMessage to the current provider", async () => {
      const mockCallback = jest.fn();
      await provider.streamMessage("model", "message", mockCallback);
      expect(mockOpenRouterAPI.streamMessage).toHaveBeenCalledWith(
        "model",
        "message",
        mockCallback,
      );
    });

    it("should throw an error when sendMessage is called with an unsupported model", async () => {
      mockOpenRouterAPI.validateModel.mockResolvedValueOnce(false);
      mockOpenRouterAPI.sendMessage.mockRejectedValueOnce(
        new Error("Model not available"),
      );
      await expect(
        provider.sendMessage("unsupported-model", "message"),
      ).rejects.toThrowError("Model not available");
    });

    it("should throw an error when sendMessageWithContext is called with an unsupported model", async () => {
      mockOpenRouterAPI.validateModel.mockResolvedValueOnce(false);
      mockOpenRouterAPI.sendMessageWithContext.mockRejectedValueOnce(
        new Error("Model not available"),
      );
      await expect(
        provider.sendMessageWithContext(
          "unsupported-model",
          "message",
          "systemInstructions",
        ),
      ).rejects.toThrowError("Model not available");
    });
  });
});
