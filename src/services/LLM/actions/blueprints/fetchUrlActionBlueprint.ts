import { IActionBlueprint } from "../core/IAction";
import { FetchUrlAction } from "../FetchUrlAction";

export const fetchUrlActionBlueprint: IActionBlueprint = {
  tag: "fetch_url",
  class: FetchUrlAction,
  description: "Fetch content from a URL",
  priority: 0,
  canRunInParallel: true,
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
