import { autoInjectable } from "tsyringe";
import { ActionTag, getBlueprint, getImplementedActions } from "./blueprints";
import { ActionFactory } from "./core/ActionFactory";
import { IActionResult } from "./types/ActionTypes";

interface IPendingAction {
  type: string;
  content: string;
  priority: number;
}

@autoInjectable()
export class ActionExecutor {
  constructor(private actionFactory: ActionFactory) {}

  async executeAction(actionText: string): Promise<IActionResult> {
    try {
      // Get all implemented action types
      const implementedActions = getImplementedActions();

      // Validate XML structure
      for (const actionType of implementedActions) {
        if (
          actionText.includes(actionType) &&
          !actionText.includes(`<${actionType}>`) &&
          !actionText.includes(`</${actionType}>`)
        ) {
          return {
            success: false,
            error: new Error(
              `Found "${actionType}" without proper XML tag structure. Tags must be wrapped in < > brackets. For example: <${actionType}>content</${actionType}>`,
            ),
          };
        }
      }

      // Extract actions using regex
      const actionMatch = /<(\w+)>([\s\S]*?)<\/\1>/g;
      const matches = Array.from(actionText.matchAll(actionMatch));

      if (!matches.length) {
        return {
          success: false,
          error: new Error(
            "No valid action tags found. Actions must be wrapped in XML-style tags.",
          ),
        };
      }

      // Collect and sort actions based on blueprint priorities
      const pendingActions: IPendingAction[] = matches
        .filter(
          ([, actionType]) => actionType !== "path" && actionType !== "content",
        )
        .map(([fullMatch, actionType]) => {
          const blueprint = getBlueprint(actionType as ActionTag);
          return {
            type: actionType,
            content: fullMatch,
            priority: blueprint?.priority || 0,
          };
        })
        .sort((a, b) => (b.priority || 0) - (a.priority || 0));

      // Execute actions in order
      let lastResult: IActionResult = { success: true };
      for (const action of pendingActions) {
        // Validate action type
        if (!implementedActions.includes(action.type as ActionTag)) {
          return {
            success: false,
            error: new Error(`Unknown action type: ${action.type}`),
          };
        }

        const actionInstance = this.actionFactory.createAction(
          action.type as ActionTag,
        );
        if (!actionInstance) {
          return {
            success: false,
            error: new Error(
              `Failed to create action instance for "${action.type}"`,
            ),
          };
        }

        // Get blueprint for logging
        const blueprint = getBlueprint(action.type as ActionTag);
        if (blueprint) {
          console.log(
            `⚡ ${blueprint.description || `Executing ${action.type}`}...`,
          );
        }

        // Execute action with full tag content
        lastResult = await actionInstance.execute(action.content);

        if (!lastResult.success) break;
      }

      return lastResult;
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
  }
}
