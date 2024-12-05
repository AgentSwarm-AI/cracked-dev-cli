import { openRouterClient } from "@constants/openRouterClient";
import { ModelInfo } from "@services/LLM/ModelInfo";
import { DebugLogger } from "@services/logging/DebugLogger";
import { container } from "tsyringe";
import { UnitTestMocker } from "../../../jest/mocks/UnitTestMocker";

// Unmock ModelInfo for its own tests
jest.unmock("@services/LLM/ModelInfo");

describe("ModelInfo", () => {
  let modelInfo: ModelInfo;
  let debugLogger: DebugLogger;
  let mocker: any;
  let unitTestMocker: UnitTestMocker;

  beforeAll(() => {
    debugLogger = container.resolve(DebugLogger);
    modelInfo = new ModelInfo(debugLogger);
  });

  beforeEach(() => {
    unitTestMocker = new UnitTestMocker();

    mocker = {
      spyOn: jest.spyOn,
    };

    // Mock openRouterClient.get with realistic model IDs
    mocker.spyOn(openRouterClient, "get").mockResolvedValue({
      data: {
        data: [
          {
            id: "qwen/qwen-2.5-coder-32b-instruct",
            context_length: 2048,
            top_provider: {
              max_completion_tokens: 4096,
            },
          },
          {
            id: "anthropic/claude-3.5-sonnet:beta",
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
      mocker
        .spyOn(openRouterClient, "get")
        .mockRejectedValue(new Error("Failed to fetch models"));

      await expect(modelInfo.initialize()).rejects.toThrow(
        "Failed to fetch models",
      );
      expect(debugLogger.log).toHaveBeenCalledWith(
        "ModelInfo",
        "Failed to initialize model list",
        expect.anything(),
      );
    });
  });

  describe("setCurrentModel", () => {
    beforeEach(async () => {
      await modelInfo.initialize();
    });

    it("should set the current model", async () => {
      await modelInfo.setCurrentModel("qwen/qwen-2.5-coder-32b-instruct");

      expect(modelInfo["currentModel"]).toBe(
        "qwen/qwen-2.5-coder-32b-instruct",
      );
      expect(modelInfo["currentModelInfo"]).toEqual({
        id: "qwen/qwen-2.5-coder-32b-instruct",
        context_length: 2048,
        top_provider: {
          max_completion_tokens: 4096,
        },
      });
    });
  });

  describe("getModelInfo", () => {
    beforeEach(async () => {
      await modelInfo.initialize();
    });

    it("should return the model info", async () => {
      const modelInfoResult = await modelInfo.getModelInfo(
        "qwen/qwen-2.5-coder-32b-instruct",
      );

      expect(modelInfoResult).toEqual({
        id: "qwen/qwen-2.5-coder-32b-instruct",
        context_length: 2048,
        top_provider: {
          max_completion_tokens: 4096,
        },
      });
    });

    it("should return undefined if the model is not found", async () => {
      const modelInfoResult = await modelInfo.getModelInfo("invalid-model");

      expect(modelInfoResult).toBeUndefined();
    });
  });

  describe("getCurrentModelInfo", () => {
    beforeEach(async () => {
      await modelInfo.initialize();
      await modelInfo.setCurrentModel("qwen/qwen-2.5-coder-32b-instruct");
    });

    it("should return the current model info", () => {
      const currentModelInfo = modelInfo.getCurrentModelInfo();

      expect(currentModelInfo).toEqual({
        id: "qwen/qwen-2.5-coder-32b-instruct",
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
      await modelInfo.setCurrentModel("qwen/qwen-2.5-coder-32b-instruct");
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
      const contextLength = await modelInfo.getModelContextLength(
        "qwen/qwen-2.5-coder-32b-instruct",
      );

      expect(contextLength).toBe(2048);
    });

    it("should return the default context length if the model is not found", async () => {
      const contextLength =
        await modelInfo.getModelContextLength("invalid-model");

      expect(contextLength).toBe(128000);
    });
  });

  describe("getAllModels", () => {
    beforeEach(async () => {
      await modelInfo.initialize();
    });

    it("should return all models", async () => {
      const models = await modelInfo.getAllModels();

      expect(models).toEqual([
        "qwen/qwen-2.5-coder-32b-instruct",
        "anthropic/claude-3.5-sonnet:beta",
      ]);
    });
  });

  describe("isModelAvailable", () => {
    beforeEach(async () => {
      await modelInfo.initialize();
    });

    it("should return true if the model is available", async () => {
      const isAvailable = await modelInfo.isModelAvailable(
        "qwen/qwen-2.5-coder-32b-instruct",
      );

      expect(isAvailable).toBe(true);
    });

    it("should return false if the model is not available", async () => {
      const isAvailable = await modelInfo.isModelAvailable("invalid-model");

      expect(isAvailable).toBe(false);
    });
  });

  describe("getModelMaxCompletionTokens", () => {
    beforeEach(async () => {
      await modelInfo.initialize();
    });

    it("should return the model max completion tokens", async () => {
      const maxTokens = await modelInfo.getModelMaxCompletionTokens(
        "qwen/qwen-2.5-coder-32b-instruct",
      );

      expect(maxTokens).toBe(4096);
    });

    it("should return the default max completion tokens if the model is not found", async () => {
      const maxTokens =
        await modelInfo.getModelMaxCompletionTokens("invalid-model");

      expect(maxTokens).toBe(4096);
    });
  });

  describe("getCurrentModelMaxCompletionTokens", () => {
    beforeEach(async () => {
      await modelInfo.initialize();
      await modelInfo.setCurrentModel("qwen/qwen-2.5-coder-32b-instruct");
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
      await modelInfo.setCurrentModel("qwen/qwen-2.5-coder-32b-instruct");
    });

    it("should log the current model usage", async () => {
      await modelInfo.logCurrentModelUsage(1024);

      expect(debugLogger.log).toHaveBeenCalledWith("ModelInfo", "Token usage", {
        model: "qwen/qwen-2.5-coder-32b-instruct",
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
