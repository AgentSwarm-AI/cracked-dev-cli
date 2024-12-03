import { ConfigService } from "../services/ConfigService";

export interface IModelConfig {
  id: string;
  description?: string;
  maxWriteTries: number;
  maxGlobalTries: number;
}

const configService = new ConfigService();
const config = configService.getConfig();

export const autoScaleAvailableModels: IModelConfig[] =
  config.autoScaleAvailableModels || [
    {
      id: "qwen/qwen-2.5-coder-32b-instruct",
      description: "Cheap, fast, slightly better than GPT4o-mini",
      maxWriteTries: 5,
      maxGlobalTries: 10,
    },
    {
      id: "anthropic/claude-3.5-sonnet:beta",
      description: "Scaled model for retry attempts",
      maxWriteTries: 5,
      maxGlobalTries: 15,
    },
    {
      id: "openai/gpt-4o-2024-11-20",
      description: "Scaled model for retry attempts",
      maxWriteTries: 2,
      maxGlobalTries: 20,
    },
  ];

export const getModelForTryCount = (
  tryCount: string | null,
  globalTries: number,
): string => {
  if (!tryCount) return autoScaleAvailableModels[0].id;

  const tries = parseInt(tryCount, 10);

  // Find the appropriate model based on try count and maxTries
  for (let i = 0; i < autoScaleAvailableModels.length; i++) {
    const previousTriesSum = autoScaleAvailableModels
      .slice(0, i)
      .reduce((sum, model) => sum + model.maxWriteTries, 0);

    // Scale up if either condition is met:
    // 1. Current try count exceeds the sum of maxWriteTries up to this model
    // 2. Global try count exceeds maxGlobalTries for this model
    if (
      tries >= previousTriesSum + autoScaleAvailableModels[i].maxWriteTries ||
      globalTries >= autoScaleAvailableModels[i].maxGlobalTries
    ) {
      continue; // Move to next model
    }

    return autoScaleAvailableModels[i].id;
  }

  // If all thresholds are exceeded, return the last model
  return autoScaleAvailableModels[autoScaleAvailableModels.length - 1].id;
};
