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

export const isAnthropicModel = (model: string): boolean => {
  return ANTHROPIC_MODEL_REGEX.test(model);
};

const MAX_CHUNK_SIZE = 8000;

// Minimum token thresholds for caching based on model
const MIN_CACHE_TOKENS = {
  opus: 1024,
  sonnet: 1024,
  haiku: 2048,
};

// Estimate tokens (4 chars per token is a rough estimate)
const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

export const formatMessageContent = (
  content: string,
  model: string,
  messageIndex: number,
  totalMessages: number,
): string | IMessageContent[] => {
  if (!isAnthropicModel(model)) {
    return content;
  }

  // Extract model type from the model string
  const modelType = model.match(/(?:opus|sonnet|haiku)/)?.[0];
  if (!modelType) return content;

  // Get minimum token threshold for this model
  const minTokens =
    MIN_CACHE_TOKENS[modelType as keyof typeof MIN_CACHE_TOKENS] || 2048;

  // Only cache if content exceeds minimum token threshold
  const shouldCache = estimateTokens(content) >= minTokens;

  // For content below MAX_CHUNK_SIZE, return single block
  if (content.length <= MAX_CHUNK_SIZE) {
    return [
      {
        type: "text",
        text: content,
        ...(shouldCache && { cache_control: { type: "ephemeral" } }),
      },
    ];
  }

  // For large content, split into chunks
  const chunks: string[] = [];
  let remaining = content;
  while (remaining.length > 0) {
    const chunk = remaining.slice(0, MAX_CHUNK_SIZE);
    chunks.push(chunk);
    remaining = remaining.slice(MAX_CHUNK_SIZE);
  }

  // Only add cache_control if total content meets minimum token threshold
  return chunks.map((chunk, index) => ({
    type: "text",
    text: chunk,
    ...(shouldCache && index === 0 && { cache_control: { type: "ephemeral" } }),
  }));
};
