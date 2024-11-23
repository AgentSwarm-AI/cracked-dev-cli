interface IModelConfig {
  id: string;
  description?: string;
  maxWriteTries: number;
}

export const autoScaleAvailableModels: IModelConfig[] = [
  // {
  //   id: "openai/gpt-4o-mini",
  //   description: "Cheap and fast",
  //   maxTries: 2,
  // },
  {
    id: "qwen/qwen-2.5-coder-32b-instruct",
    description: "Cheap, fast, slightly better than GPT4o-mini",
    maxWriteTries: 2,
  },
  {
    id: "anthropic/claude-3.5-sonnet:beta",
    description: "Scaled model for retry attempts",
    maxWriteTries: 2,
  },
  {
    id: "openai/gpt-4o-2024-11-20",
    description: "Scaled model for retry attempts",
    maxWriteTries: 5,
  },
  {
    id: "openai/o1-mini",
    description: "Final model for complex cases (currently inactive)",
    maxWriteTries: 2,
  },
];

export const getModelForTryCount = (tryCount: string | null): string => {
  if (!tryCount) return autoScaleAvailableModels[0].id;

  const tries = parseInt(tryCount, 10);

  // Find the appropriate model based on try count and maxTries
  for (let i = 0; i < autoScaleAvailableModels.length; i++) {
    const previousTriesSum = autoScaleAvailableModels
      .slice(0, i)
      .reduce((sum, model) => sum + model.maxWriteTries, 0);

    if (tries < previousTriesSum + autoScaleAvailableModels[i].maxWriteTries) {
      return autoScaleAvailableModels[i].id;
    }
  }

  // If tries exceed all models' maxTries, return the last model
  return autoScaleAvailableModels[autoScaleAvailableModels.length - 1].id;
};
