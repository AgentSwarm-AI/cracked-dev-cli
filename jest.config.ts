import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/src/jest/jestSetupFilesAfterEnv.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@constants/(.*)$": "<rootDir>/src/constants/$1",
    "^@services/(.*)$": "<rootDir>/src/services/$1",
    "^@tests/(.*)$": "<rootDir>/src/__tests__/$1",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
  },
  extensionsToTreatAsEsm: [".ts"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  transformIgnorePatterns: ["node_modules"],
  testMatch: ["<rootDir>/src/**/__tests__/**/*.test.ts"],
};

export default config;
