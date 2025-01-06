import { LLMContextCreator } from "@services/LLM/LLMContextCreator";
import { ActionTagsExtractor } from "@services/LLM/actions/ActionTagsExtractor";
import {
  IActionDependency,
  IActionExecutionPlan,
  IActionGroup,
  WriteActionData,
} from "@services/LLM/actions/types/ActionTypes";
import { DebugLogger } from "@services/logging/DebugLogger";
import { HtmlEntityDecoder } from "@services/text/HTMLEntityDecoder";
import path from "path";
import { autoInjectable } from "tsyringe";
import { v4 as uuidv4 } from "uuid";
import { MessageContextHistory } from "../context/MessageContextHistory";
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
    private messageContextHistory: MessageContextHistory,
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

  private extractContentFromAction(actionContent: string): string {
    // First try to find content tag
    const contentMatch = actionContent.match(/<content>([\s\S]*?)<\/content>/);
    if (contentMatch) {
      return contentMatch[1];
    }

    // If no content tag, try to find path tag for file operations
    const pathMatch = actionContent.match(/<path>(.*?)<\/path>/);
    if (pathMatch) {
      return pathMatch[1];
    }

    // For read_file actions, we want the entire content for dependency tracking
    if (actionContent.includes("<read_file>")) {
      return actionContent;
    }

    return "";
  }

  private detectActionDependencies(
    actions: IActionDependency[],
  ): IActionDependency[] {
    return actions.map((action) => {
      const dependsOn: string[] = [];

      if (action.type === "write_file") {
        // Find read_file actions whose content is used in this write_file
        const readActions = actions.filter((a) => {
          if (a.type !== "read_file") return false;
          const readContent = this.extractContentFromAction(a.content);
          const writeContent = this.extractContentFromAction(action.content);
          return writeContent.includes(readContent);
        });
        dependsOn.push(...readActions.map((a) => a.actionId));
      }

      if (["move_file", "delete_file", "copy_file"].includes(action.type)) {
        // These actions should wait for any write operations on the same file
        const writeActions = actions.filter((a) => {
          if (a.type !== "write_file") return false;
          const writePath = this.extractFilePath(a.content);
          const actionPath = this.extractFilePath(action.content);
          return writePath === actionPath;
        });
        dependsOn.push(...writeActions.map((a) => a.actionId));
      }

      return { ...action, dependsOn };
    });
  }

  private createExecutionPlan(
    actions: IActionDependency[],
  ): IActionExecutionPlan {
    const groups: IActionGroup[] = [];
    const unprocessedActions = [...actions];

    // Helper to check if an action can be executed in parallel
    const canRunInParallel = (action: IActionDependency) => {
      const blueprint = getBlueprint(action.type);
      return blueprint.canRunInParallel !== false;
    };

    while (unprocessedActions.length > 0) {
      const currentGroup: IActionDependency[] = [];
      const remainingActions: IActionDependency[] = [];

      // First, find all actions that can be executed (no pending dependencies)
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

      // If we have actions that can be executed, split them into parallel and sequential groups
      if (currentGroup.length > 0) {
        const parallelActions = currentGroup.filter(canRunInParallel);
        const sequentialActions = currentGroup.filter(
          (action) => !canRunInParallel(action),
        );

        // Add parallel actions as one group if there are any
        if (parallelActions.length > 0) {
          groups.push({
            actions: parallelActions,
            parallel: true,
          });
        }

        // Add each sequential action as its own group
        sequentialActions.forEach((action) => {
          groups.push({
            actions: [action],
            parallel: false,
          });
        });
      }

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

    // Find all action tags in order of appearance
    const actions: IActionDependency[] = [];
    const actionTags = getImplementedActions();
    const allTagsRegex = new RegExp(
      `<(${actionTags.join("|")})>[\\s\\S]*?</\\1>`,
      "g",
    );
    const matches = Array.from(combinedText.matchAll(allTagsRegex));

    for (const match of matches) {
      const content = match[0];
      const type = match[1] as any; // The captured tag name
      if (!this.processedTags.includes(content)) {
        actions.push({
          actionId: uuidv4(),
          type,
          content,
        });
        this.processedTags.push(content);
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

    if (actionType === "execute_command" && result.success) {
      return `Command execution result:\n\n${result.data}\n\nPlease analyze this output and continue with the task.`;
    }

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

    if (actionType === "end_phase" && result.success) {
      const data = result.data as WriteActionData;
      if (data?.regenerate && data?.prompt) {
        return data.prompt as string;
      }
      return `Phase completed. Moving to next phase.`;
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
              if (result.action.includes("<write_file>")) {
                const writeData = result.result.data as WriteActionData;
                if (writeData?.selectedModel) {
                  selectedModel = writeData.selectedModel;
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
          }
        } else {
          for (const action of group.actions) {
            const result = await this.contextCreator.executeAction(
              action.content,
            );

            this.debugLogger.log("Action", "Action executed", {
              action: action.content,
              result,
            });

            if (result.data) {
              this.messageContextHistory.addMessage(
                "user",
                String(result.data ?? ""),
                true,
              );
            }

            results.push({ action: action.content, result });

            if (!result.success) {
              this.debugLogger.log("Action", "Action failed", {
                action: action.content,
                result,
              });
              hasError = true;
              break;
            }

            if (action.type === "write_file") {
              const writeData = result.data as WriteActionData;
              if (writeData?.selectedModel) {
                selectedModel = writeData.selectedModel;
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
