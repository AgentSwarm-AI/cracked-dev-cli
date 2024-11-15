import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    files: ["eslint.config.js"],
    ...js.configs.recommended,
  },
  {
    files: ["src/**/*.ts"],
    ...tseslint.configs.recommended,
    ignores: ["**/node_modules/**", "**/dist/**"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    rules: {
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
];
