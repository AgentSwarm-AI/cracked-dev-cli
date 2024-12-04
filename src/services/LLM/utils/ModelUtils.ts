export interface IMessageContent {
  type: string;
  text: string;
  cache_control?: {
    type: "ephemeral";
  };
}

// Matches any Anthropic model pattern:
// - Starts with 'anthropic/claude-'
// - Followed by version number (3 or 3.5 or 3-5)
// - Followed by model type (opus, sonnet, haiku)
// - Optionally followed by date (YYYYMMDD)
// - Optionally followed by :beta
const ANTHROPIC_MODEL_REGEX =
  /^anthropic\/claude-(?:3(?:[.-]5)?)-(?:opus|sonnet|haiku)(?:-\d{8})?(?::beta)?$/;

const MAX_CHUNK_SIZE = 8000;
const MAX_CACHE_BLOCKS = 4;

// Lower thresholds to enable more effective caching
const MIN_CACHE_TOKENS = {
  opus: 256, // Cache larger blocks for opus given higher cost
  sonnet: 128, // Balance between caching and cost
  haiku: 64, // More aggressive caching for cheaper model
} as const;

export const isAnthropicModel = (model: string): boolean => {
  return ANTHROPIC_MODEL_REGEX.test(model);
};

export const getModelType = (
  model: string,
): keyof typeof MIN_CACHE_TOKENS | null => {
  const match = model.match(/(?:opus|sonnet|haiku)/)?.[0];
  return (match as keyof typeof MIN_CACHE_TOKENS) || null;
};

export const estimateTokens = (text: string): number => {
  // Count code blocks and technical patterns more accurately
  const codeBlockMatches = text.match(/```[\s\S]*?```/g) || [];
  let codeTokens = 0;
  let regularContent = text;

  for (const codeBlock of codeBlockMatches) {
    const codeContent = codeBlock.slice(3, -3); // Remove ``` markers
    codeTokens += Math.ceil(codeContent.length / 5.5);
    codeTokens += 2; // Add tokens for ``` markers
    regularContent = regularContent.replace(codeBlock, "");
  }

  // Regular text uses more characters per token
  const regularTokens = Math.ceil(regularContent.length / 3.8);

  return codeTokens + regularTokens;
};

export const shouldApplyCache = (
  content: string,
  modelType: keyof typeof MIN_CACHE_TOKENS | null,
  messageIndex: number,
): boolean => {
  if (!modelType || messageIndex >= MAX_CACHE_BLOCKS) return false;

  const minTokens = MIN_CACHE_TOKENS[modelType];
  return estimateTokens(content) >= minTokens;
};

export const splitContentIntoChunks = (content: string): string[] => {
  if (content.length <= MAX_CHUNK_SIZE) {
    return [content];
  }

  const chunks: string[] = [];
  let remaining = content;

  while (remaining.length > 0) {
    let chunkSize = MAX_CHUNK_SIZE;
    if (remaining.length > MAX_CHUNK_SIZE) {
      // Look for natural break points
      const naturalBreak = remaining
        .slice(0, MAX_CHUNK_SIZE)
        .lastIndexOf("\n\n");
      if (naturalBreak > MAX_CHUNK_SIZE * 0.5) {
        chunkSize = naturalBreak + 2; // Add 2 to include the \n\n
      }
    }
    const chunk = remaining.slice(0, chunkSize);
    chunks.push(chunk);
    remaining = remaining.slice(chunkSize);
  }

  return chunks;
};

export const formatMessageContent = (
  content: string,
  model: string,
  messageIndex: number,
  totalMessages: number,
): string | IMessageContent[] => {
  if (!isAnthropicModel(model)) {
    return content;
  }

  const modelType = getModelType(model);
  const shouldCache = shouldApplyCache(content, modelType, messageIndex);
  const chunks = splitContentIntoChunks(content);

  // For single chunk content
  if (chunks.length === 1) {
    return [
      {
        type: "text",
        text: content,
        ...(shouldCache && { cache_control: { type: "ephemeral" } }),
      },
    ];
  }

  // For multi-chunk content, prioritize caching larger chunks
  if (shouldCache) {
    const chunksWithTokens = chunks.map((chunk, idx) => ({
      chunk,
      tokens: estimateTokens(chunk),
      index: idx,
    }));

    // Sort by token count descending
    chunksWithTokens.sort((a, b) => b.tokens - a.tokens);

    // Take top chunks that fit within remaining cache blocks
    const remainingBlocks = MAX_CACHE_BLOCKS - messageIndex;
    const chunksToCacheIndices = new Set(
      chunksWithTokens.slice(0, remainingBlocks).map((c) => c.index),
    );

    return chunks.map((chunk, idx) => ({
      type: "text",
      text: chunk,
      ...(chunksToCacheIndices.has(idx) && {
        cache_control: { type: "ephemeral" },
      }),
    }));
  }

  // For non-cached content
  return chunks.map((chunk) => ({
    type: "text",
    text: chunk,
  }));
};