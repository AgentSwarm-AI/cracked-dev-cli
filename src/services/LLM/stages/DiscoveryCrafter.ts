import { autoInjectable, inject } from "tsyringe";
import { TagsExtractor } from "../../TagsExtractor/TagsExtractor";
import { TaskStage } from "../../TaskManager/TaskStage";
import { ActionExecutor } from "../actions/ActionExecutor";
import { LLMContextCreator } from "../LLMContextCreator";

export interface DiscoveryResult {
  requirements: string[];
  relevantFiles: string[];
  patterns: string[];
}

@autoInjectable()
export class DiscoveryCrafter {
  constructor(
    @inject(TagsExtractor) private tagsExtractor: TagsExtractor,
    @inject(LLMContextCreator) private contextCreator: LLMContextCreator,
    @inject(ActionExecutor) private actionExecutor: ActionExecutor,
  ) {}

  async initiateDiscovery(task: string, root: string): Promise<string> {
    // Get initial context with environment details
    return await this.contextCreator.create(
      task,
      root,
      true,
      TaskStage.DISCOVERY,
      "",
    );
  }

  async executeDiscoveryActions(response: string): Promise<any[]> {
    // Execute any file reading or search actions from LLM response
    return await this.contextCreator.parseAndExecuteActions(response);
  }

  parseDiscoveryResponse(response: string): DiscoveryResult {
    // First check for standard discovery tag
    const discoveryContent = this.tagsExtractor.extractTag(
      response,
      "discovery",
    );

    if (discoveryContent) {
      return {
        requirements: this.tagsExtractor.extractTagLines(
          discoveryContent,
          "requirements",
        ),
        relevantFiles: this.tagsExtractor.extractTagLines(
          discoveryContent,
          "relevant_files",
        ),
        patterns: this.tagsExtractor.extractTagLines(
          discoveryContent,
          "patterns",
        ),
      };
    }

    // If no discovery tag but we have a read_file action and completion
    if (response.includes("read_file") && this.isDiscoveryComplete(response)) {
      const filePath = this.extractReadFilePath(response);
      return {
        requirements: [],
        relevantFiles: filePath ? [filePath] : [],
        patterns: [],
      };
    }

    // Default empty result
    return { requirements: [], relevantFiles: [], patterns: [] };
  }

  private extractReadFilePath(response: string): string {
    // First try to extract using TagsExtractor
    const readFileContent = this.tagsExtractor.extractTag(
      response,
      "read_file",
    );
    if (readFileContent) {
      const path = this.tagsExtractor.extractTag(readFileContent, "path");
      if (path) return path;
    }

    // Fallback to regex if TagsExtractor didn't work
    const match = response.match(
      /<read_file>.*?<path>(.*?)<\/path>.*?<\/read_file>/s,
    );
    if (match && match[1]) {
      return match[1].trim();
    }

    return "";
  }

  isDiscoveryComplete(response: string): boolean {
    // First check for task_objective_completed tag
    const completedContent = this.tagsExtractor.extractTag(
      response,
      "task_objective_completed",
    );
    if (completedContent) {
      return true;
    }

    // For simple queries, check if we have both:
    // 1. A read_file action that was executed
    // 2. The action completed successfully
    const hasReadFile = response.includes("read_file");
    const hasFileContent = response.includes("Action completed successfully");
    const hasCompletion = response.includes("task_objective_completed");

    // Only consider it complete if we have all three
    return hasReadFile && hasFileContent && hasCompletion;
  }
}
