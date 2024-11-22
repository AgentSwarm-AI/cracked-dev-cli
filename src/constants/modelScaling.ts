interface IModelConfig {
  id: string;
  description?: string;
}

export const AUTO_SCALER_MAX_TRY_PER_MODEL = 2;

export const autoScaleAvailableModels: IModelConfig[] = [
  {
    id: "qwen/qwen-2.5-coder-32b-instruct",
    description: "Base model for initial attempts",
  },
  {
    id: "anthropic/claude-3.5-sonnet:beta",
    description: "Scaled model for retry attempts",
  },
  {
    id: "openai/gpt-4o-2024-11-20",
    description: "Scaled model for retry attempts",
  },
  {
    id: "openai/o1-mini",
    description: "Final model for complex cases (currently inactive)",
  },
];

export const getModelForTryCount = (tryCount: string | null): string => {
  if (!tryCount) return autoScaleAvailableModels[0].id;

  const tries = parseInt(tryCount, 10);
  // Calculate scale level based on try count and threshold
  const scaleLevel = Math.floor(tries / AUTO_SCALER_MAX_TRY_PER_MODEL);

  // Use min to prevent exceeding available models
  const modelIndex = Math.min(scaleLevel, autoScaleAvailableModels.length - 1);
  return autoScaleAvailableModels[modelIndex].id;
};
