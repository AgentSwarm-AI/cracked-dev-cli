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

export const formatMessageContent = (
  content: string,
  model: string,
): string | IMessageContent[] => {
  if (!isAnthropicModel(model)) {
    return content;
  }

  // For Anthropic models, if content is large enough to benefit from caching (e.g. > 1000 chars)
  // wrap it in a cache control structure
  if (content.length > 1000) {
    return [
      {
        type: "text",
        text: content,
        cache_control: {
          type: "ephemeral",
        },
      },
    ];
  }

  return [
    {
      type: "text",
      text: content,
    },
  ];
};
