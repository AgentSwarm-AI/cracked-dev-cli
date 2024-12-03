import { singleton } from "tsyringe";
import { ActionTag, getBlueprint } from "../blueprints";
import { ActionPriority } from "../types/ActionPriority";
import { IActionResult } from "../types/ActionTypes";

interface QueuedAction {
  type: string;
  content: string;
  priority: ActionPriority;
  requiresProcessing: boolean;
  result?: IActionResult;
}

@singleton()
export class ActionQueue {
  private queue: QueuedAction[] = [];
  private processedResults: Map<string, unknown> = new Map();

  enqueue(type: string, content: string): void {
    const blueprint = getBlueprint(type as ActionTag);
    const priority = blueprint?.priority || ActionPriority.LOW;
    const requiresProcessing = blueprint?.requiresProcessing || false;

    this.queue.push({
      type,
      content,
      priority,
      requiresProcessing,
    });

    // Sort queue by priority (lower numbers = higher priority)
    this.queue.sort((a, b) => a.priority - b.priority);
  }

  dequeue(): QueuedAction | undefined {
    if (this.queue.length === 0) {
      return undefined;
    }

    // Get the highest priority action that hasn't been processed
    const nextAction = this.queue.find((action) => !action.result);

    if (!nextAction) {
      return undefined;
    }

    // If it doesn't require processing, remove it from the queue
    if (!nextAction.requiresProcessing) {
      const index = this.queue.indexOf(nextAction);
      this.queue.splice(index, 1);
    }

    return nextAction;
  }

  setActionResult(type: string, content: string, result: IActionResult): void {
    const actionIndex = this.queue.findIndex(
      (action) => action.type === type && action.content === content,
    );

    if (actionIndex !== -1) {
      const action = this.queue[actionIndex];

      if (action.requiresProcessing && result.success) {
        // Store processed results
        this.processedResults.set(`${type}:${content}`, result.data);
        // Remove the processed action from the queue
        this.queue.splice(actionIndex, 1);
      } else if (action.requiresProcessing && !result.success) {
        // Optionally, you can handle failed processing here
        // For example, you might want to retry or log the failure
        // Currently, the action remains in the queue for potential reprocessing
      } else {
        // If the action does not require processing, remove it
        this.queue.splice(actionIndex, 1);
      }
    }
  }

  getProcessedResults(): Map<string, unknown> {
    return this.processedResults;
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  size(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
    this.processedResults.clear();
  }
}
