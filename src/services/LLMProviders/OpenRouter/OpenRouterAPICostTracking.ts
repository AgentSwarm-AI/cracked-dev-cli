// OpenRouterAPICostTracking.ts
import { autoInjectable } from "tsyringe";

interface PriceInfo {
  prompt: string;
  completion: string;
  image: string;
  request: string;
}

interface UsageEntry {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface UsageHistory {
  [modelName: string]: UsageEntry[];
}

@autoInjectable()
export class OpenRouterAPICostTracking {
  constructor() {}

  private calculateCosts(priceAll: PriceInfo, usage: UsageHistory) {
    const promptRate = parseFloat(priceAll.prompt);
    const completionRate = parseFloat(priceAll.completion);

    let currentCost = 0;
    let totalCost = 0;

    for (const modelKey in usage) {
      const modelUsage = usage[modelKey];
      if (modelUsage.length > 0) {
        // Calculate total cost for the model
        const modelTotalCost = modelUsage.reduce((sum, entry) => {
          const cost =
            entry.prompt_tokens * promptRate +
            entry.completion_tokens * completionRate;
          return sum + cost;
        }, 0);

        totalCost += modelTotalCost;

        // Calculate current cost (last usage entry for the model)
        const lastUsage = modelUsage[modelUsage.length - 1];
        currentCost =
          lastUsage.prompt_tokens * promptRate +
          lastUsage.completion_tokens * completionRate;
      }
    }

    return {
      currentCost,
      totalCost,
    };
  }

  public logChatCosts(
    priceAll: PriceInfo | undefined,
    usage: UsageHistory,
  ): void {
    if (priceAll && usage) {
      const { currentCost, totalCost } = this.calculateCosts(priceAll, usage);

      console.log("Current Chat Cost: $", currentCost.toFixed(10));
      console.log("Total Chat Cost:   $", totalCost.toFixed(10));
    } else {
      console.log(
        "PriceInfo or UsageHistory is undefined, cannot calculate costs.",
      );
    }
  }
}
