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
