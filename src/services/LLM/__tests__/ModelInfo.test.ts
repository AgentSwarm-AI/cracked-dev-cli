import { ModelInfo } from "@services/LLM/ModelInfo";
import { DebugLogger } from "@services/logging/DebugLogger";
import { container } from "tsyringe";
import { openRouterClient } from "@constants/openRouterClient";
import { IModelInfo } from "@services/LLM/types/ModelTypes";

describe("ModelInfo", () => {
  let modelInfo: ModelInfo;
  let debugLogger: DebugLogger;
  let mocker: any;

  beforeAll(() => {
    debugLogger = container.resolve(DebugLogger);
    modelInfo = new ModelInfo(debugLogger);
  });

  beforeEach(() => {
    mocker = {
      spyOn: jest.spyOn,
    };

    // Mock openRouterClient.get
    mocker.spyOn(openRouterClient, "get").mockResolvedValue({
      data: {
        data: [
          {
            id: "model1",
            context_length: 2048,
            top_provider: {
              max_completion_tokens: 4096,
            },
          },
          {
            id: "model2",
            context_length: 4096,
            top_provider: {
              max_completion_tokens: 8192,
            },
          },
        ],
      },
    });

    // Mock debugLogger.log
    mocker.spyOn(debugLogger, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("initialize", () => {
    it("should initialize the model list", async () => {
      await modelInfo.initialize();

      expect(modelInfo["modelInfoMap"].size).toBe(2);
      expect(modelInfo["initialized"]).toBe(true);
    });

    it("should log an error if initialization fails", async () => {
      mocker.spyOn(openRouterClient, "get").mockRejectedValue(new Error("Failed to fetch models"));

      await expect(modelInfo.initialize()).rejects.toThrow("Failed to fetch models");
      expect(debugLogger.log).toHaveBeenCalledWith("ModelInfo", "Failed to initialize model list", expect.anything());
    });
  });

  describe("setCurrentModel", () => {
    beforeEach(async () => {
      await modelInfo.initialize();
    });

    it("should set the current model", async () => {
      await modelInfo.setCurrentModel("model1");

      expect(modelInfo["currentModel"]).toBe("model1");
      expect(modelInfo["currentModelInfo"]).toEqual({
        id: "model1",
        context_length: 2048,
        top_provider: {
          max_completion_tokens: 4096,
        },
      });
    });

    it("should throw an error if the model is not found", async () => {
      await expect(modelInfo.setCurrentModel("model3")).rejects.toThrow("Invalid model: model3. Available models: model1, model2");
    });
  });

  describe("getModelInfo", () => {
    beforeEach(async () => {
      await modelInfo.initialize();
    });

    it("should return the model info", async () => {
      const modelInfoResult = await modelInfo.getModelInfo("model1");

      expect(modelInfoResult).toEqual({
        id: "model1",
        context_length: 2048,
        top_provider: {
          max_completion_tokens: 4096,
        },
      });
    });

    it("should return undefined if the model is not found", async () => {
      const modelInfoResult = await modelInfo.getModelInfo("model3");

      expect(modelInfoResult).toBeUndefined();
    });
  });

  describe("getCurrentModelInfo", () => {
    beforeEach(async () => {
      await modelInfo.initialize();
      await modelInfo.setCurrentModel("model1");
    });

    it("should return the current model info", () => {
      const currentModelInfo = modelInfo.getCurrentModelInfo();

      expect(currentModelInfo).toEqual({
        id: "model1",
        context_length: 2048,
        top_provider: {
          max_completion_tokens: 4096,
        },
      });
    });

    it("should return null if no current model is set", async () => {
      modelInfo["currentModel"] = null;
      modelInfo["currentModelInfo"] = null;

      const currentModelInfo = modelInfo.getCurrentModelInfo();

      expect(currentModelInfo).toBeNull();
    });
  });

  describe("getCurrentModelContextLength", () => {
    beforeEach(async () => {
      await modelInfo.initialize();
      await modelInfo.setCurrentModel("model1");
    });

    it("should return the current model context length", async () => {
      const contextLength = await modelInfo.getCurrentModelContextLength();

      expect(contextLength).toBe(2048);
    });

    it("should return the default context length if no current model is set", async () => {
      modelInfo["currentModel"] = null;
      modelInfo["currentModelInfo"] = null;

      const contextLength = await modelInfo.getCurrentModelContextLength();

      expect(contextLength).toBe(128000);
    });
  });

  describe("getModelContextLength", () => {
    beforeEach(async () => {
      await modelInfo.initialize();
    });

    it("should return the model context length", async () => {
      const contextLength = await modelInfo.getModelContextLength("model1");

      expect(contextLength).toBe(2048);
    });

    it("should return the default context length if the model is not found", async () => {
      const contextLength = await modelInfo.getModelContextLength("model3");

      expect(contextLength).toBe(128000);
    });
  });

  describe("getAllModels", () => {
    beforeEach(async () => {
      await modelInfo.initialize();
    });

    it("should return all models", async () => {
      const models = await modelInfo.getAllModels();

      expect(models).toEqual(["model1", "model2"]);
    });
  });

  describe("isModelAvailable", () => {
    beforeEach(async () => {
      await modelInfo.initialize();
    });

    it("should return true if the model is available", async () => {
      const isAvailable = await modelInfo.isModelAvailable("model1");

      expect(isAvailable).toBe(true);
    });

    it("should return false if the model is not available", async () => {
      const isAvailable = await modelInfo.isModelAvailable("model3");

      expect(isAvailable).toBe(false);
    });
  });

  describe("getModelMaxCompletionTokens", () => {
    beforeEach(async () => {
      await modelInfo.initialize();
    });

    it("should return the model max completion tokens", async () => {
      const maxTokens = await modelInfo.getModelMaxCompletionTokens("model1");

      expect(maxTokens).toBe(4096);
    });

    it("should return the default max completion tokens if the model is not found", async () => {
      const maxTokens = await modelInfo.getModelMaxCompletionTokens("model3");

      expect(maxTokens).toBe(4096);
    });
  });

  describe("getCurrentModelMaxCompletionTokens", () => {
    beforeEach(async () => {
      await modelInfo.initialize();
      await modelInfo.setCurrentModel("model1");
    });

    it("should return the current model max completion tokens", async () => {
      const maxTokens = await modelInfo.getCurrentModelMaxCompletionTokens();

      expect(maxTokens).toBe(4096);
    });

    it("should return the default max completion tokens if no current model is set", async () => {
      modelInfo["currentModel"] = null;
      modelInfo["currentModelInfo"] = null;

      const maxTokens = await modelInfo.getCurrentModelMaxCompletionTokens();

      expect(maxTokens).toBe(4096);
    });
  });

  describe("logCurrentModelUsage", () => {
    beforeEach(async () => {
      await modelInfo.initialize();
      await modelInfo.setCurrentModel("model1");
    });

    it("should log the current model usage", async () => {
      await modelInfo.logCurrentModelUsage(1024);

      expect(debugLogger.log).toHaveBeenCalledWith("ModelInfo", "Token usage", {
        model: "model1",
        used: 1024,
        total: 2048,
        percentage: "50.0%",
        remaining: 1024,
      });
    });

    it("should not log if no current model is set", async () => {
      modelInfo["currentModel"] = null;
      modelInfo["currentModelInfo"] = null;

      await modelInfo.logCurrentModelUsage(1024);

      expect(debugLogger.log).not.toHaveBeenCalled();
    });
  });
});