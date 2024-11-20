import { openRouterClient } from "../../../../constants/openRouterClient";
import { ConversationContext } from "../../../LLM/ConversationContext";
import { HtmlEntityDecoder } from "../../../text/HTMLEntityDecoder";
import { ModelScaler } from "../../../LLM/ModelScaler";
import { DebugLogger } from "../../../logging/DebugLogger";
import { OpenRouterAPI } from "../OpenRouterAPI";
import { IOpenRouterModelInfo } from "../types/OpenRouterAPITypes";

jest.mock("../../../../constants/openRouterClient");
jest.mock("../../../LLM/ConversationContext");
jest.mock("../../../text/HTMLEntityDecoder");
jest.mock("../../../LLM/ModelScaler");
jest.mock("../../../logging/DebugLogger");

describe("OpenRouterAPI", () => {
  let openRouterAPI: OpenRouterAPI;
  let conversationContext: jest.Mocked<ConversationContext>;
  let htmlEntityDecoder: jest.Mocked<HtmlEntityDecoder>;
  let modelScaler: jest.Mocked<ModelScaler>;
  let debugLogger: jest.Mocked<DebugLogger>;

  beforeEach(() => {
    (openRouterClient.post as jest.Mock).mockClear();
    (openRouterClient.get as jest.Mock).mockClear();
    conversationContext =
      new ConversationContext() as jest.Mocked<ConversationContext>;
    htmlEntityDecoder =
      new HtmlEntityDecoder() as jest.Mocked<HtmlEntityDecoder>;
    debugLogger = new DebugLogger() as jest.Mocked<DebugLogger>;
    modelScaler = new ModelScaler(debugLogger) as jest.Mocked<ModelScaler>;

    conversationContext.getMessages.mockReturnValue([]);
    conversationContext.addMessage.mockImplementation(
      jest.fn(() => Promise.resolve()),
    );

    htmlEntityDecoder.unescapeString.mockImplementation((str) => str);
    htmlEntityDecoder.decode.mockImplementation((str) => str);

    openRouterAPI = new OpenRouterAPI(conversationContext, htmlEntityDecoder, modelScaler, debugLogger);
  });

  describe("sendMessage", () => {
    it("should send a message and return the assistant response", async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: "Hello assistant response!",
              },
            },
          ],
        },
      };
      (openRouterClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const message = await openRouterAPI.sendMessage("model1", "Hello user!");
      expect(openRouterClient.post).toHaveBeenCalledWith("/chat/completions", {
        model: "model1",
        messages: [{ role: "user", content: "Hello user!" }],
      });
      expect(message).toBe("Hello assistant response!");
    });

    it("should handle errors and throw LLMError", async () => {
      const mockError = {
        response: {
          data: {
            error: {
              message: "An error occurred",
              code: 400,
            },
          },
        },
      };
      (openRouterClient.post as jest.Mock).mockRejectedValue(mockError);

      await expect(
        openRouterAPI.sendMessage("model1", "Hello user!"),
      ).rejects.toThrow("An error occurred");
    });
  });

  describe("sendMessageWithContext", () => {
    it("should add system instructions if provided", async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: "Hello assistant response!",
              },
            },
          ],
        },
      };
      (openRouterClient.post as jest.Mock).mockResolvedValue(mockResponse);

      await openRouterAPI.sendMessageWithContext(
        "model1",
        "Hello user!",
        "System instructions",
      );
      expect(conversationContext.setSystemInstructions).toHaveBeenCalledWith(
        "System instructions",
      );
    });
  });

  describe("getAvailableModels", () => {
    it("should return a list of available models", async () => {
      const mockResponse = {
        data: {
          data: [
            { id: "model1", name: "Model 1" } as IOpenRouterModelInfo,
            { id: "model2", name: "Model 2" } as IOpenRouterModelInfo,
          ],
        },
      };
      (openRouterClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const models = await openRouterAPI.getAvailableModels();
      expect(models).toEqual(["model1", "model2"]);
    });

    it("should handle errors and throw LLMError", async () => {
      const mockError = {
        response: {
          data: {
            error: {
              message: "An error occurred",
              code: 400,
            },
          },
        },
      };
      (openRouterClient.get as jest.Mock).mockRejectedValue(mockError);

      await expect(openRouterAPI.getAvailableModels()).rejects.toThrow(
        "An error occurred",
      );
    });
  });

  describe("validateModel", () => {
    it("should return true if model is available", async () => {
      jest
        .spyOn(openRouterAPI, "getAvailableModels")
        .mockResolvedValue(["model1", "model2"]);

      const isValid = await openRouterAPI.validateModel("model1");
      expect(isValid).toBe(true);
    });

    it("should return false if model is not available", async () => {
      jest
        .spyOn(openRouterAPI, "getAvailableModels")
        .mockResolvedValue(["model1", "model2"]);

      const isValid = await openRouterAPI.validateModel("model3");
      expect(isValid).toBe(false);
    });
  });

  describe("getModelInfo", () => {
    it("should return the model info", async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: "model1",
              name: "Model 1",
              context_length: 4096,
            } as IOpenRouterModelInfo,
          ],
        },
      };
      (openRouterClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const modelInfo = await openRouterAPI.getModelInfo("model1");
      expect(modelInfo).toEqual({
        id: "model1",
        name: "Model 1",
        context_length: 4096,
      });
    });

    it("should return an empty object if model is not found", async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: "model1",
              name: "Model 1",
              context_length: 4096,
            } as IOpenRouterModelInfo,
          ],
        },
      };
      (openRouterClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const modelInfo = await openRouterAPI.getModelInfo("model2");
      expect(modelInfo).toEqual({});
    });

    it("should handle errors and throw LLMError", async () => {
      const mockError = {
        response: {
          data: {
            error: {
              message: "An error occurred",
              code: 400,
            },
          },
        },
      };
      (openRouterClient.get as jest.Mock).mockRejectedValue(mockError);

      await expect(openRouterAPI.getModelInfo("model1")).rejects.toThrow(
        "An error occurred",
      );
    });
  });
});