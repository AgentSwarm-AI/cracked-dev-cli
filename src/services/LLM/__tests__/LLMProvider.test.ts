import { container } from "tsyringe";
import { OpenRouterAPI } from "../../LLMProviders/OpenRouter/OpenRouterAPI";
import { ILLMProvider } from "../ILLMProvider";
import { LLMProvider, LLMProviderType } from "../LLMProvider";
import { ConversationContext } from "../ConversationContext";

jest.mock("../../LLMProviders/OpenRouter/OpenRouterAPI");
jest.mock("../ConversationContext");

describe("LLMProvider", () => {
  let provider: ILLMProvider;
  let mockOpenRouterAPI: jest.Mocked<OpenRouterAPI>;
  let mockConversationContext: jest.Mocked<ConversationContext>;

  beforeEach(() => {
    mockConversationContext = new ConversationContext() as jest.Mocked<ConversationContext>;
    jest.spyOn(mockConversationContext, "setSystemInstructions").mockImplementation();
    jest.spyOn(mockConversationContext, "getSystemInstructions").mockReturnValue(null);
    jest.spyOn(mockConversationContext, "getMessages").mockReturnValue([]);
    jest.spyOn(mockConversationContext, "clear").mockImplementation();
    jest.spyOn(mockConversationContext, "addMessage").mockImplementation();

    mockOpenRouterAPI = new OpenRouterAPI(mockConversationContext) as jest.Mocked<OpenRouterAPI>;
    jest.spyOn(mockOpenRouterAPI, "sendMessage").mockResolvedValue("response");
    jest.spyOn(mockOpenRouterAPI, "sendMessageWithContext").mockResolvedValue("response");
    jest.spyOn(mockOpenRouterAPI, "clearConversationContext").mockImplementation();
    jest.spyOn(mockOpenRouterAPI, "getConversationContext").mockReturnValue([]);
    jest.spyOn(mockOpenRouterAPI, "addSystemInstructions").mockImplementation();
    jest.spyOn(mockOpenRouterAPI, "getAvailableModels").mockResolvedValue(["model1", "model2"]);
    jest.spyOn(mockOpenRouterAPI, "validateModel").mockResolvedValue(true);
    jest.spyOn(mockOpenRouterAPI, "getModelInfo").mockResolvedValue({});
    jest.spyOn(mockOpenRouterAPI, "streamMessage").mockResolvedValue(undefined);

    // Mocking container.resolve to return the LLMProvider instance
    container.resolve = jest.fn().mockImplementation((token) => {
      if (token === ConversationContext) {
        return mockConversationContext;
      } else if (token === OpenRouterAPI) {
        return mockOpenRouterAPI;
      } else if (token === LLMProvider) {
        return new LLMProvider();
      }
      return null;
    });

    // Resolving LLMProvider after setting up the mocks
    provider = container.resolve(LLMProvider);
  });

  describe("getInstance", () => {
    it("should return an instance of OpenRouterAPI for OpenRouter provider type", () => {
      provider = LLMProvider.getInstance(LLMProviderType.OpenRouter);
      expect(provider).toBe(mockOpenRouterAPI);
    });

    it("should throw an error if the provider type is not recognized", () => {
      expect(() => {
        LLMProvider.getInstance("unsupported-type" as any);
      }).toThrowError("Unsupported provider type: unsupported-type");
    });
  });

  describe("Delegated Methods", () => {
    beforeEach(() => {
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
      mockOpenRouterAPI.validateModel = jest.fn().mockResolvedValue(false);
      mockOpenRouterAPI.sendMessage = jest.fn().mockRejectedValue(new Error("Model not available"));
      await expect(provider.sendMessage("unsupported-model", "message")).rejects.toThrowError("Model not available");
    });

    it("should throw an error when sendMessageWithContext is called with an unsupported model", async () => {
      mockOpenRouterAPI.validateModel = jest.fn().mockResolvedValue(false);
      mockOpenRouterAPI.sendMessageWithContext = jest.fn().mockRejectedValue(new Error("Model not available"));
      await expect(provider.sendMessageWithContext("unsupported-model", "message", "systemInstructions")).rejects.toThrowError("Model not available");
    });
  });
});