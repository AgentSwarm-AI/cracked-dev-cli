interface IModelConfig {
  id: string;
  priority: number;
  active: boolean;
  description?: string;
}

export const MODEL_SCALE_THRESHOLD = 1;

export const modelConfigs: IModelConfig[] = [
  {
    id: "qwen/qwen-2.5-coder-32b-instruct",
    priority: 1,
    active: true,
    description: "Base model for initial attempts",
  },
  {
    id: "anthropic/claude-3.5-sonnet:beta",
    priority: 2,
    active: true,
    description: "Scaled model for retry attempts",
  },
  {
    id: "openai/gpt-4o-2024-11-20",
    priority: 3,
    active: true,
    description: "Scaled model for retry attempts",
  },
  {
    id: "openai/o1-mini",
    priority: 4,
    active: true,
    description: "Final model for complex cases (currently inactive)",
  },
];

export const getModelForTryCount = (tryCount: string | null): string => {
  if (!tryCount) return modelConfigs[0].id;

  const tries = parseInt(tryCount, 10);
  // Calculate scale level based on try count and threshold
  const scaleLevel = Math.floor(tries / MODEL_SCALE_THRESHOLD);

  // Find active models
  const activeModels = modelConfigs
    .filter((model) => model.active)
    .sort((a, b) => a.priority - b.priority);

  // Use min to prevent exceeding available models
  const modelIndex = Math.min(scaleLevel, activeModels.length - 1);
  return activeModels[modelIndex].id;
};
