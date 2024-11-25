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

export const formatMessageContent = (
  content: string,
  model: string,
  messageIndex: number,
  totalMessages: number,
): string | IMessageContent[] => {
  if (!isAnthropicModel(model)) {
    return content;
  }

  // Find first user message index
  const shouldCache = (index: number, total: number): boolean => {
    // Always cache first user message
    if (index === 0) return true;
    // Cache last 3 messages
    return index >= total - 3;
  };

  const addCacheControl = shouldCache(messageIndex, totalMessages);

  // For small content, return single block
  if (content.length <= 1000) {
    return [
      {
        type: "text",
        text: content,
        ...(addCacheControl && { cache_control: { type: "ephemeral" } }),
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

  return chunks.map((chunk, index) => ({
    type: "text",
    text: chunk,
    ...(addCacheControl &&
      index === 0 && { cache_control: { type: "ephemeral" } }),
  }));
};
