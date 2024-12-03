import { formatMessageContent, isAnthropicModel } from "../ModelUtils";

describe("ModelUtils", () => {
  describe("isAnthropicModel", () => {
    const validModels = [
      "anthropic/claude-3-opus",
      "anthropic/claude-3-sonnet",
      "anthropic/claude-3-haiku",
      "anthropic/claude-3.5-sonnet",
      "anthropic/claude-3.5-haiku",
      "anthropic/claude-3.5-sonnet-20240620",
      "anthropic/claude-3-5-haiku-20241022",
      "anthropic/claude-3-opus:beta",
      "anthropic/claude-3.5-sonnet:beta",
    ];

    const invalidModels = [
      "openai/gpt-4",
      "anthropic/invalid-model",
      "anthropic/claude-4-opus",
      "anthropic/claude-2-sonnet",
      "anthropic/claude-3-invalid",
      "anthropic/claude-3.5-invalid",
    ];

    test.each(validModels)(
      "should return true for valid Anthropic model: %s",
      (model) => {
        expect(isAnthropicModel(model)).toBe(true);
      },
    );

    test.each(invalidModels)(
      "should return false for invalid model: %s",
      (model) => {
        expect(isAnthropicModel(model)).toBe(false);
      },
    );
  });

  describe("formatMessageContent", () => {
    const longContent = "a".repeat(4097); // 4097 characters, which is 1025 tokens
    const shortContent = "short message";
    const veryLongContent = "a".repeat(10000); // Exceeds MAX_CHUNK_SIZE

    test("should add cache control for long content with Anthropic model", () => {
      const result = formatMessageContent(
        longContent,
        "anthropic/claude-3-opus",
        0,
        3
      );

      expect(result).toEqual([
        {
          type: "text",
          text: longContent,
          cache_control: {
            type: "ephemeral",
          },
        },
      ]);
    });

    test("should not add cache control for short content with Anthropic model", () => {
      const result = formatMessageContent(
        shortContent,
        "anthropic/claude-3-opus",
        1,
        3
      );

      expect(result).toEqual([
        {
          type: "text",
          text: shortContent,
        },
      ]);
    });

    test("should return raw content for non-Anthropic model", () => {
      const result = formatMessageContent(longContent, "openai/gpt-4", 0, 1);
      expect(result).toBe(longContent);
    });

    test("should split very long content into chunks", () => {
      const result = formatMessageContent(
        veryLongContent,
        "anthropic/claude-3-opus",
        0,
        1
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(1);
      expect(result[0]).toHaveProperty('cache_control');
      expect(result[1]).not.toHaveProperty('cache_control');
    });

    test("should handle different token thresholds for different models", () => {
      // Test Haiku model which has higher token threshold
      const mediumContent = "a".repeat(6000); // ~1500 tokens
      const result = formatMessageContent(
        mediumContent,
        "anthropic/claude-3-haiku",
        0,
        1
      );

      expect(Array.isArray(result)).toBe(true);
      // Should not have cache_control as it's below Haiku's threshold
      expect(result[0]).not.toHaveProperty('cache_control');
    });

    test("should handle invalid model type gracefully", () => {
      const result = formatMessageContent(
        longContent,
        "anthropic/invalid-model",
        0,
        1
      );
      expect(result).toBe(longContent);
    });

    test("should maintain text integrity when chunking", () => {
      const testContent = "a".repeat(9000);
      const result = formatMessageContent(
        testContent,
        "anthropic/claude-3-opus",
        0,
        1
      ) as Array<any>;

      const reconstructed = result.map(chunk => chunk.text).join('');
      expect(reconstructed).toBe(testContent);
    });

    test("should handle empty content", () => {
      const result = formatMessageContent(
        "",
        "anthropic/claude-3-opus",
        0,
        1
      );
      expect(result).toEqual([{ type: "text", text: "" }]);
    });
  });
});