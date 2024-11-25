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
    const longContent = "a".repeat(1001);
    const shortContent = "short message";

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
          cache_control: {
            type: "ephemeral",
          },
        },
      ]);
    });

    test("should return raw content for non-Anthropic model", () => {
      const result = formatMessageContent(longContent, "openai/gpt-4", 0, 1);
      expect(result).toBe(longContent);
    });
  });
});