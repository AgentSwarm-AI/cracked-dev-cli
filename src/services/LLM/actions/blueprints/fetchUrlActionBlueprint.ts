import { IActionBlueprint } from "../core/IAction";
import { FetchUrlAction } from "../FetchUrlAction";
import { ActionPriority } from "../types/ActionPriority";

export const fetchUrlActionBlueprint: IActionBlueprint = {
  tag: "fetch_url",
  class: FetchUrlAction,
  description: "Fetch content from a URL",
  usageExplanation: `The fetch_url action allows you to retrieve content from URLs. Here are common use cases:

1. Fetch JSON data:
<fetch_url>
  <url>https://api.example.com/data.json</url>
</fetch_url>

2. Fetch documentation:
<fetch_url>
  <url>https://docs.example.com/guide</url>
</fetch_url>

Note:
- URL must start with http:// or https://
- Only use trusted domains
- Response is returned as text
- Large responses may be truncated
- Handle errors appropriately`,
  priority: ActionPriority.LOW,
  canRunInParallel: true,
  requiresProcessing: true,
  parameters: [
    {
      name: "url",
      required: true,
      description: "The URL to fetch content from",
      validator: (value: any) =>
        typeof value === "string" &&
        value.length > 0 &&
        (value.startsWith("http://") || value.startsWith("https://")),
    },
  ],
};
