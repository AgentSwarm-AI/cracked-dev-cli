import "reflect-metadata";

// Mock modelScaling module
jest.mock("@constants/modelScaling", () => ({
  __esModule: true,
  autoScaleAvailableModels: [
    {
      id: "qwen/qwen-2.5-coder-32b-instruct",
      description: "Cheap, fast, slightly better than GPT4o-mini",
      maxWriteTries: 2,
      maxGlobalTries: 5,
    },
    {
      id: "anthropic/claude-3.5-sonnet:beta",
      description: "Scaled model for retry attempts",
      maxWriteTries: 3,
      maxGlobalTries: 10,
    },
    {
      id: "openai/gpt-4o-2024-11-20",
      description: "Scaled model for retry attempts",
      maxWriteTries: 5,
      maxGlobalTries: 15,
    },
    {
      id: "openai/o1-mini",
      description: "Final model for complex cases (currently inactive)",
      maxWriteTries: 2,
      maxGlobalTries: 20,
    },
  ],
  getModelForTryCount: (
    tryCount: string | null,
    globalTries: number,
  ): string => {
    const models = [
      {
        id: "qwen/qwen-2.5-coder-32b-instruct",
        maxWriteTries: 2,
        maxGlobalTries: 5,
      },
      {
        id: "anthropic/claude-3.5-sonnet:beta",
        maxWriteTries: 3,
        maxGlobalTries: 10,
      },
      {
        id: "openai/gpt-4o-2024-11-20",
        maxWriteTries: 5,
        maxGlobalTries: 15,
      },
      {
        id: "openai/o1-mini",
        maxWriteTries: 2,
        maxGlobalTries: 20,
      },
    ];

    if (!tryCount) return models[0].id;

    const tries = parseInt(tryCount, 10);

    for (let i = 0; i < models.length; i++) {
      const previousTriesSum = models
        .slice(0, i)
        .reduce((sum, model) => sum + model.maxWriteTries, 0);

      if (
        tries >= previousTriesSum + models[i].maxWriteTries ||
        globalTries >= models[i].maxGlobalTries
      ) {
        continue;
      }

      return models[i].id;
    }

    return models[models.length - 1].id;
  },
}));

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
