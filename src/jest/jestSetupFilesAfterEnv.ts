import "reflect-metadata";

// Mock modelScaling module
jest.mock("@constants/modelScaling", () => ({
  MODEL_SCALE_THRESHOLD: 2,
  modelConfigs: [
    {
      id: "qwen/qwen-2.5-coder-32b-instruct",
      priority: 1,
      active: true,
    },
    {
      id: "anthropic/claude-3.5-sonnet:beta",
      priority: 2,
      active: true,
    },
  ],
  getModelForTryCount: (tryCount: string | null): string => {
    if (!tryCount) return "qwen/qwen-2.5-coder-32b-instruct";
    const tries = parseInt(tryCount, 10);
    return tries >= 2
      ? "anthropic/claude-3.5-sonnet:beta"
      : "qwen/qwen-2.5-coder-32b-instruct";
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
