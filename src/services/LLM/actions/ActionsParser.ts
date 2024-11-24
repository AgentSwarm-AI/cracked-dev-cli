import { LLMContextCreator } from "@services/LLM/LLMContextCreator";
import { ActionTagsExtractor } from "@services/LLM/actions/ActionTagsExtractor";
import {
  IActionDependency,
  IActionExecutionPlan,
  IActionGroup,
} from "@services/LLM/actions/types/ActionTypes";
import { DebugLogger } from "@services/logging/DebugLogger";
import { HtmlEntityDecoder } from "@services/text/HTMLEntityDecoder";
import path from "path";
import { autoInjectable } from "tsyringe";
import { v4 as uuidv4 } from "uuid";
import { getBlueprint, getImplementedActions } from "./blueprints";

export interface ActionExecutionResult {
  actions: Array<{ action: string; result: any }>;
  followupResponse?: string;
  selectedModel?: string;
}

@autoInjectable()
export class ActionsParser {
  private currentMessageBuffer: string = "";
  private isProcessingAction: boolean = false;
  private messageComplete: boolean = false;
  private processedTags: string[] = [];
  private currentModel: string = "";

  constructor(
    private debugLogger: DebugLogger,
    private contextCreator: LLMContextCreator,
    private htmlEntityDecoder: HtmlEntityDecoder,
    private actionTagsExtractor: ActionTagsExtractor,
  ) {}

  reset() {
    this.currentMessageBuffer = "";
    this.isProcessingAction = false;
    this.messageComplete = false;
    this.processedTags = [];
  }

  isCompleteMessage(text: string): boolean {
    return true;
  }

  private getActionsWithPathParam(): string[] {
    return getImplementedActions().filter((tag) => {
      const blueprint = getBlueprint(tag);
      return blueprint.parameters?.some((param) => param.name === "path");
    });
  }

  extractFilePath(tag: string): string | null {
    // Get actions that have a path parameter from their blueprints
    const fileActions = this.getActionsWithPathParam();
    const actionMatch = new RegExp(`<(${fileActions.join("|")})>`).exec(tag);
    if (!actionMatch) return null;

    const pathMatch = /<path>(.*?)<\/path>/;
    const match = tag.match(pathMatch);
    if (!match) return null;

    return path.resolve(process.cwd(), match[1]);
  }

  extractUrl(tag: string): string | null {
    const actionMatch = /<fetch_url>[\s\S]*?<\/fetch_url>/i.exec(tag);
    if (!actionMatch) return null;

    const urlMatch = /<url>(.*?)<\/url>/i.exec(tag);
    if (!urlMatch) return null;

    return urlMatch[1];
  }

  private detectActionDependencies(
    actions: IActionDependency[],
  ): IActionDependency[] {
    return actions.map((action) => {
      const dependsOn: string[] = [];

      if (action.type === "write_file") {
        const readActions = actions.filter(
          (a) =>
            a.type === "read_file" &&
            action.content.includes(this.extractContentFromAction(a.content)),
        );
        dependsOn.push(...readActions.map((a) => a.actionId));
      }

      if (["move_file", "delete_file"].includes(action.type)) {
        const writeActions = actions.filter(
          (a) =>
            a.type === "write_file" &&
            this.extractFilePath(a.content) ===
              this.extractFilePath(action.content),
        );
        dependsOn.push(...writeActions.map((a) => a.actionId));
      }

      return { ...action, dependsOn };
    });
  }

  private extractContentFromAction(actionContent: string): string {
    const match = actionContent.match(/<content>([\s\S]*?)<\/content>/);
    return match ? match[1] : "";
  }

  private createExecutionPlan(
    actions: IActionDependency[],
  ): IActionExecutionPlan {
    const groups: IActionGroup[] = [];
    const unprocessedActions = [...actions];

    while (unprocessedActions.length > 0) {
      const currentGroup: IActionDependency[] = [];
      const remainingActions: IActionDependency[] = [];

      unprocessedActions.forEach((action) => {
        const canExecute =
          !action.dependsOn?.length ||
          action.dependsOn.every(
            (depId) =>
              actions.find((a) => a.actionId === depId)?.type === "end_task" ||
              !unprocessedActions.find((ua) => ua.actionId === depId),
          );

        if (canExecute) {
          currentGroup.push(action);
        } else {
          remainingActions.push(action);
        }
      });

      const canExecuteInParallel = currentGroup.every(
        (action) =>
          !["write_file", "delete_file", "move_file"].includes(action.type) ||
          currentGroup.length === 1,
      );

      groups.push({
        actions: currentGroup,
        parallel: canExecuteInParallel,
      });

      unprocessedActions.length = 0;
      unprocessedActions.push(...remainingActions);
    }

    return { groups };
  }

  findCompleteTags(text: string): IActionExecutionPlan {
    const combinedText = this.currentMessageBuffer + text;

    // Validate tag structure before processing
    const validationError =
      this.actionTagsExtractor.validateStructure(combinedText);
    if (validationError) {
      this.debugLogger.log("Validation", "Tag structure validation failed", {
        error: validationError,
      });
      return { groups: [] };
    }

    // Use getImplementedActions instead of getActionTags to only get fully implemented actions
    const actionTags = getImplementedActions();
    const actions: IActionDependency[] = [];

    for (const tag of actionTags) {
      const tagRegex = new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, "g");
      const matches = combinedText.matchAll(tagRegex);

      for (const match of matches) {
        const content = match[0];
        if (!this.processedTags.includes(content)) {
          actions.push({
            actionId: uuidv4(),
            type: tag,
            content,
          });
          this.processedTags.push(content);
        }
      }
    }

    const actionsWithDependencies = this.detectActionDependencies(actions);
    return this.createExecutionPlan(actionsWithDependencies);
  }

  appendToBuffer(chunk: string) {
    this.currentMessageBuffer += chunk;
  }

  clearBuffer() {
    this.currentMessageBuffer = "";
    this.processedTags = [];
  }

  get buffer() {
    return this.currentMessageBuffer;
  }

  get isProcessing() {
    return this.isProcessingAction;
  }

  set isProcessing(value: boolean) {
    this.isProcessingAction = value;
  }

  get isComplete() {
    return this.messageComplete;
  }

  set isComplete(value: boolean) {
    this.messageComplete = value;
  }

  private formatActionResult(action: string, result: any): string {
    const actionMatch = /<(\w+)>([\s\S]*?)<\/\1>/.exec(action);
    if (!actionMatch) return `[Action Result] Invalid action format`;

    const [_, actionType] = actionMatch;

    if (actionType === "read_file" && result.success) {
      const output = this.htmlEntityDecoder.decode(
        JSON.stringify(result.data),
        {
          unescape: true,
        },
      );
      if (typeof result.data === "string" && result.data.includes("# File:")) {
        return result.data;
      }
      return `Here's the content of the requested file:\n\n${output}\n\nPlease analyze this content and continue with the task.`;
    }

    if (actionType === "fetch_url" && result.success) {
      return `Here's the content fetched from the URL:\n\n${result.data}\n\nPlease analyze this content and continue with the task.`;
    }

    if (actionType === "end_task" && result.success) {
      return `Task completed: ${result.data}`;
    }

    if (actionType === "relative_path_lookup" && result.success) {
      return `Found matching path: ${JSON.stringify(result.data)}`;
    }

    return `[Action Result] ${actionType}: ${JSON.stringify(result)} ${result.success && "Proceed to next previously planned step."}`;
  }

  async parseAndExecuteActions(
    text: string,
    model: string,
    llmCallback: (message: string) => Promise<string>,
  ): Promise<ActionExecutionResult> {
    try {
      this.currentModel = model;
      const executionPlan = this.findCompleteTags(text);
      this.debugLogger.log("ExecutionPlan", "Created action execution plan", {
        plan: executionPlan,
      });

      const results: Array<{ action: string; result: any }> = [];
      let selectedModel = model;
      let hasError = false;

      for (const group of executionPlan.groups) {
        if (hasError) break;

        if (group.parallel) {
          const actionPromises = group.actions.map((action) =>
            this.contextCreator
              .executeAction(action.content)
              .then((result) => ({
                action: action.content,
                result,
              })),
          );
          const groupResults = await Promise.all(actionPromises);
          results.push(...groupResults);

          // Check for errors in parallel actions
          for (const result of groupResults) {
            if (!result.result.success) {
              this.debugLogger.log("Action", "Action failed", {
                action: result.action,
                result: result.result,
              });
              hasError = true;
              break;
            }
          }

          if (!hasError) {
            for (const result of groupResults) {
              if (
                result.action.includes("<write_file>") &&
                result.result.data?.selectedModel
              ) {
                selectedModel = result.result.data.selectedModel;
                this.debugLogger.log(
                  "Model",
                  "Updated model from write action",
                  {
                    model: selectedModel,
                  },
                );
              }
            }
          }
        } else {
          for (const action of group.actions) {
            const result = await this.contextCreator.executeAction(
              action.content,
            );
            results.push({ action: action.content, result });

            if (!result.success) {
              this.debugLogger.log("Action", "Action failed", {
                action: action.content,
                result,
              });
              hasError = true;
              break;
            }

            if (action.type === "write_file" && result.data?.selectedModel) {
              selectedModel = result.data.selectedModel;
              this.debugLogger.log("Model", "Updated model from write action", {
                model: selectedModel,
              });
            }
          }
        }
      }

      const endTaskAction = results.find(
        ({ action, result }) => action.includes("<end_task>") && result.success,
      );

      if (endTaskAction) {
        this.debugLogger.log("EndTask", "Task completed", {
          message: endTaskAction.result.data,
        });
        return { actions: results, selectedModel };
      }

      const actionResults = results
        .map(({ action, result }) => this.formatActionResult(action, result))
        .join("\n\n");

      // Only get followupResponse if there were no errors
      let followupResponse;
      if (!hasError) {
        followupResponse = await llmCallback(actionResults);
        this.debugLogger.log(
          "Response",
          "Received LLM response for action results",
          {
            response: followupResponse,
            selectedModel,
          },
        );
      }

      return { actions: results, followupResponse, selectedModel };
    } catch (error) {
      console.error("Error in parseAndExecuteActions:", error);
      this.debugLogger.log("Error", "Failed to parse and execute actions", {
        error,
      });
      return { actions: [] };
    }
  }
}
