import { IActionBlueprint } from "../core/IAction";
import { SearchAction } from "../SearchAction";
import { ActionPriority } from "../types/ActionPriority";

export const searchStringActionBlueprint: IActionBlueprint = {
  tag: "search_string",
  class: SearchAction,
  description: "Search for content within files",
  usageExplanation: `The search_string action helps you find specific content within files. Here are common use cases:

1. Search for a class or function:
<search_string>
  <directory>src</directory>
  <term>export class MyService</term>
</search_string>

2. Search for specific code patterns:
<search_string>
  <directory>src/services</directory>
  <term>@injectable()</term>
</search_string>

Note:
- Use specific directories to narrow down search
- Search terms can be partial matches
- Case-sensitive by default
- Results show file path and line number`,
  priority: ActionPriority.HIGH,
  canRunInParallel: true,
  requiresProcessing: true,
  parameters: [
    {
      name: "directory",
      required: true,
      description: "The directory to search in",
      validator: (value: any) => typeof value === "string" && value.length > 0,
    },
    {
      name: "term",
      required: true,
      description: "The content to search for",
      validator: (value: any) => typeof value === "string" && value.length > 0,
    },
  ],
};

export const searchFileActionBlueprint: IActionBlueprint = {
  tag: "search_file",
  class: SearchAction,
  description: "Search for files by name",
  usageExplanation: `The search_file action helps you find files by name or pattern. Here are common use cases:

1. Search for a specific file:
<search_file>
  <directory>src</directory>
  <term>MyService.ts</term>
</search_file>

2. Search using patterns:
<search_file>
  <directory>src/services</directory>
  <term>*Service.ts</term>
</search_file>

Note:
- Use * for wildcards in patterns
- Search is case-sensitive
- Results show full file paths
- Use specific directories to narrow search`,
  priority: ActionPriority.HIGH,
  canRunInParallel: true,
  requiresProcessing: true,
  parameters: [
    {
      name: "directory",
      required: true,
      description: "The directory to search in",
      validator: (value: any) => typeof value === "string" && value.length > 0,
    },
    {
      name: "term",
      required: true,
      description: "The filename pattern to search for",
      validator: (value: any) => typeof value === "string" && value.length > 0,
    },
  ],
};
