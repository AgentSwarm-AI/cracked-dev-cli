import {
  estimateTokens,
  formatMessageContent,
  getModelType,
  isAnthropicModel,
  shouldApplyCache,
  splitContentIntoChunks,
} from "../ModelUtils";

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

  describe("getModelType", () => {
    test("should extract opus from model name", () => {
      expect(getModelType("anthropic/claude-3-opus")).toBe("opus");
    });

    test("should extract sonnet from model name", () => {
      expect(getModelType("anthropic/claude-3.5-sonnet")).toBe("sonnet");
    });

    test("should extract haiku from model name", () => {
      expect(getModelType("anthropic/claude-3-haiku")).toBe("haiku");
    });

    test("should return null for invalid model", () => {
      expect(getModelType("anthropic/claude-3-invalid")).toBeNull();
    });

    test("should handle beta versions", () => {
      expect(getModelType("anthropic/claude-3-opus:beta")).toBe("opus");
    });
  });

  describe("estimateTokens", () => {
    test("should estimate tokens for regular text", () => {
      const text = "a".repeat(350); // ~92-93 tokens with 3.8 chars/token
      expect(estimateTokens(text)).toBe(93);
    });

    test("should estimate tokens for code blocks", () => {
      const text = "```\n" + "x".repeat(510) + "\n```";
      // 510/5.5 ≈ 93 code tokens + 2 marker tokens = 95-96 tokens
      expect(estimateTokens(text)).toBe(96);
    });

    test("should handle mixed content", () => {
      const regularText = "a".repeat(175); // ~46 tokens
      const codeBlock = "```\n" + "x".repeat(255) + "\n```"; // ~48 tokens
      const mixed = regularText + codeBlock;
      expect(estimateTokens(mixed)).toBe(96);
    });

    test("should handle empty content", () => {
      expect(estimateTokens("")).toBe(0);
    });

    test("should account for multiple code blocks", () => {
      const codeBlock = "```\n" + "x".repeat(100) + "\n```";
      const text = codeBlock + "normal" + codeBlock;
      // Each code block: ~19 tokens + 2 marker tokens
      // "normal": 2 tokens
      // Total: (19 + 2) * 2 + 2 = 44 tokens
      expect(estimateTokens(text)).toBe(44);
    });
  });

  describe("shouldApplyCache", () => {
    test("should return true for opus model with sufficient tokens", () => {
      const content = "a".repeat(1000); // >256 tokens
      expect(shouldApplyCache(content, "opus", 0)).toBe(true);
    });

    test("should return true for sonnet model with sufficient tokens", () => {
      const content = "a".repeat(500); // >128 tokens
      expect(shouldApplyCache(content, "sonnet", 0)).toBe(true);
    });

    test("should return true for haiku model with sufficient tokens", () => {
      const content = "a".repeat(250); // >64 tokens
      expect(shouldApplyCache(content, "haiku", 0)).toBe(true);
    });

    test("should return false when message index exceeds max cache blocks", () => {
      const content = "a".repeat(1000);
      expect(shouldApplyCache(content, "opus", 4)).toBe(false);
    });

    test("should return false for null model type", () => {
      const content = "a".repeat(1000);
      expect(shouldApplyCache(content, null, 0)).toBe(false);
    });

    test("should return false for insufficient tokens", () => {
      const content = "short";
      expect(shouldApplyCache(content, "opus", 0)).toBe(false);
    });
  });

  describe("splitContentIntoChunks", () => {
    test("should not split content below max chunk size", () => {
      const content = "a".repeat(7000);
      const chunks = splitContentIntoChunks(content);
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe(content);
    });

    test("should split content above max chunk size", () => {
      const content = "a".repeat(16000);
      const chunks = splitContentIntoChunks(content);
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach((chunk) => {
        expect(chunk.length).toBeLessThanOrEqual(8000);
      });
    });

    test("should split on natural boundaries when possible", () => {
      const paragraph = "p".repeat(7000) + "\n\n";
      const content = paragraph + paragraph;
      const chunks = splitContentIntoChunks(content);

      // First chunk should end with \n\n
      expect(chunks[0].endsWith("\n\n")).toBe(true);
      // Second chunk should be the remaining content
      expect(chunks[1]).toBe(paragraph);
    });

    test("should handle empty content", () => {
      const chunks = splitContentIntoChunks("");
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe("");
    });

    test("should preserve content integrity when splitting", () => {
      const content = "a".repeat(16000);
      const chunks = splitContentIntoChunks(content);
      const reconstructed = chunks.join("");
      expect(reconstructed).toBe(content);
    });
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
        3,
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
        3,
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

    test("should split very long content into chunks with prioritized caching", () => {
      const result = formatMessageContent(
        veryLongContent,
        "anthropic/claude-3-opus",
        0,
        1,
      ) as Array<any>;

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(1);

      // Count chunks with cache_control
      const cachedChunks = result.filter((chunk) => chunk.cache_control);
      expect(cachedChunks.length).toBeLessThanOrEqual(4);

      // Verify largest chunks are cached
      const cachedSizes = cachedChunks.map((chunk) => chunk.text.length);
      const uncachedSizes = result
        .filter((chunk) => !chunk.cache_control)
        .map((chunk) => chunk.text.length);

      // Each cached chunk should be larger than or equal to any uncached chunk
      cachedSizes.forEach((cachedSize) => {
        uncachedSizes.forEach((uncachedSize) => {
          expect(cachedSize).toBeGreaterThanOrEqual(uncachedSize);
        });
      });
    });

    test("should handle empty content", () => {
      const result = formatMessageContent("", "anthropic/claude-3-opus", 0, 1);
      expect(result).toEqual([{ type: "text", text: "" }]);
    });

    test("should respect MAX_CACHE_BLOCKS limit", () => {
      const result = formatMessageContent(
        veryLongContent,
        "anthropic/claude-3-opus",
        3,
        4,
      ) as Array<any>;

      // Only 1 block available for caching (MAX_CACHE_BLOCKS - messageIndex)
      const cachedChunks = result.filter((chunk) => chunk.cache_control);
      expect(cachedChunks).toHaveLength(1);
    });
  });
});