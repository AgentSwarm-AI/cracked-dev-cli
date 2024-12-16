import "reflect-metadata";

// Mock chalk with a default export that matches how it's used
jest.mock("chalk", () => ({
  __esModule: true,
  default: {
    red: jest.fn((text) => text),
    green: jest.fn((text) => text),
    blue: jest.fn((text) => text),
    yellow: jest.fn((text) => text),
    cyan: jest.fn((text) => text),
    magenta: jest.fn((text) => text),
    white: jest.fn((text) => text),
    gray: jest.fn((text) => text),
    grey: jest.fn((text) => text),
    black: jest.fn((text) => text),
    bold: jest.fn((text) => text),
    dim: jest.fn((text) => text),
    italic: jest.fn((text) => text),
    underline: jest.fn((text) => text),
    inverse: jest.fn((text) => text),
    hidden: jest.fn((text) => text),
    strikethrough: jest.fn((text) => text),
  },
}));

// Global mock for ModelInfo
jest.mock("@services/LLM/ModelInfo", () => {
  const originalModule = jest.requireActual("@services/LLM/ModelInfo");

  return {
    ...originalModule,
    ModelInfo: jest.fn().mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      ensureInitialized: jest.fn().mockResolvedValue(undefined),
      getCurrentModel: jest.fn().mockReturnValue("gpt-4"),
      getCurrentModelInfo: jest.fn().mockReturnValue({
        id: "gpt-4",
        name: "GPT-4",
        created: Date.now(),
        description: "GPT-4 model",
        pricing: {
          prompt: "0.0001",
          completion: "0.0001",
          image: "0",
          request: "0",
        },
        context_length: 8192,
        architecture: {
          tokenizer: "gpt-4",
          instruct_type: "chatml",
          modality: "text",
        },
        top_provider: {
          context_length: 8192,
          max_completion_tokens: 4096,
          is_moderated: true,
        },
        per_request_limits: {
          prompt_tokens: null,
          completion_tokens: null,
        },
      }),
      setCurrentModel: jest.fn().mockResolvedValue(undefined),
      getModelInfo: jest.fn().mockResolvedValue({
        id: "gpt-4",
        context_length: 8192,
        top_provider: {
          max_completion_tokens: 4096,
        },
      }),
      isModelAvailable: jest.fn().mockResolvedValue(true),
      getAllModels: jest.fn().mockResolvedValue(["gpt-4"]),
      getCurrentModelContextLength: jest.fn().mockResolvedValue(8192),
      getModelContextLength: jest.fn().mockResolvedValue(8192),
      getCurrentModelMaxCompletionTokens: jest.fn().mockResolvedValue(4096),
      getModelMaxCompletionTokens: jest.fn().mockResolvedValue(4096),
      logCurrentModelUsage: jest.fn().mockResolvedValue(undefined),
      logDetailedUsage: jest.fn().mockResolvedValue(undefined),
      getUsageHistory: jest.fn().mockReturnValue({}),
    })),
  };
});

process.env.IS_UNIT_TEST = "true";
