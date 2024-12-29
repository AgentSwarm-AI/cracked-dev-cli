import { autoInjectable } from "tsyringe";
import { MessageContextHistory } from "../context/MessageContextHistory";
import { MessageContextLogger } from "../context/MessageContextLogger";
import { ActionTag, getBlueprint, getImplementedActions } from "./blueprints";
import { ActionFactory } from "./core/ActionFactory";
import { ActionQueue } from "./core/ActionQueue";
import { IActionResult } from "./types/ActionTypes";

@autoInjectable()
export class ActionExecutor {
  constructor(
    private actionFactory: ActionFactory,
    private actionQueue: ActionQueue,
    private messageContextLogger: MessageContextLogger,
    private messageContextHistory: MessageContextHistory,
  ) {}

  async executeAction(actionText: string): Promise<IActionResult> {
    try {
      // Get all implemented action types
      const implementedActions = getImplementedActions();

      // Extract actions using regex
      const actionMatch = /<(\w+)>([\s\S]*?)<\/\1>/g;
      const matches = Array.from(actionText.matchAll(actionMatch));

      if (!matches.length) {
        const error = new Error(
          "No valid action tags found. Actions must be wrapped in XML-style tags.",
        );
        this.messageContextLogger.logActionResult("unknown", {
          success: false,
          error,
        });
        this.messageContextHistory.addMessage(
          "system",
          "Action failed: No valid action tags found",
        );
        return { success: false, error };
      }

      // Queue all actions
      for (const [fullMatch, actionType] of matches) {
        // Skip if this action is inside another XML tag
        const startIndex = actionText.indexOf(fullMatch);
        const beforeText = actionText.substring(0, startIndex);
        const hasOpenTag = /<\w+>/.test(beforeText);
        const hasCloseTag = /<\/\w+>/.test(beforeText);

        // If we find an opening tag before this action but no matching closing tag,
        // it means we're inside another tag - skip this action
        if (hasOpenTag && !hasCloseTag) {
          continue;
        }

        if (actionType !== "path" && actionType !== "content") {
          if (implementedActions.includes(actionType as ActionTag)) {
            this.actionQueue.enqueue(actionType, fullMatch);
          } else {
            const error = new Error(`Unknown action type: ${actionType}`);
            this.messageContextLogger.logActionResult(actionType, {
              success: false,
              error,
            });
            this.messageContextHistory.addMessage(
              "system",
              `Action failed: Unknown type ${actionType}`,
            );
            return { success: false, error };
          }
        }
      }

      // Process actions in order
      let lastResult: IActionResult = { success: true };
      while (!this.actionQueue.isEmpty()) {
        const action = this.actionQueue.dequeue();
        if (!action) continue;

        const actionInstance = this.actionFactory.createAction(
          action.type as ActionTag,
        );
        if (!actionInstance) {
          const error = new Error(
            `Failed to create action instance for "${action.type}"`,
          );
          this.messageContextLogger.logActionResult(action.type, {
            success: false,
            error,
          });
          this.messageContextHistory.addMessage(
            "system",
            `Action ${action.type} failed: Could not create instance`,
          );
          return { success: false, error };
        }

        // Get blueprint for logging
        const blueprint = getBlueprint(action.type as ActionTag);

        // Execute action
        lastResult = await actionInstance.execute(action.content);

        // Log the result
        this.messageContextLogger.logActionResult(action.type, lastResult);

        // Add result to conversation history
        if (lastResult.success) {
          if (lastResult.data) {
            this.messageContextHistory.addMessage(
              "system",
              `Action ${action.type} succeeded: ${JSON.stringify(lastResult.data)}`,
            );
          } else {
            this.messageContextHistory.addMessage(
              "system",
              `Action ${action.type} succeeded`,
            );
          }
        } else {
          const errorMessage = lastResult.error
            ? lastResult.error.message
            : "Unknown error";
          this.messageContextHistory.addMessage(
            "system",
            `Action ${action.type} failed: ${errorMessage}`,
          );
        }

        // Store result in queue for processing requirements
        this.actionQueue.setActionResult(
          action.type,
          action.content,
          lastResult,
        );

        if (!lastResult.success) {
          // Clear queue on error
          this.actionQueue.clear();
          break;
        }

        // If this action requires processing, include its results in the final output
        if (blueprint?.requiresProcessing && lastResult.success) {
          lastResult = {
            ...lastResult,
            processedResults: this.actionQueue.getProcessedResults(),
          };
        }
      }

      // Get final processed results before clearing
      const finalProcessedResults = this.actionQueue.getProcessedResults();

      // Clear queue before returning
      this.actionQueue.clear();

      // Include processed results in final output if there are any
      return finalProcessedResults.size > 0
        ? { ...lastResult, processedResults: finalProcessedResults }
        : lastResult;
    } catch (error) {
      // Clear queue on error
      this.actionQueue.clear();

      // Log the error
      this.messageContextLogger.logActionResult("unknown", {
        success: false,
        error: error as Error,
      });
      this.messageContextHistory.addMessage(
        "system",
        `Action failed with error: ${(error as Error).message}`,
      );

      return {
        success: false,
        error: error as Error,
      };
    }
  }
}
