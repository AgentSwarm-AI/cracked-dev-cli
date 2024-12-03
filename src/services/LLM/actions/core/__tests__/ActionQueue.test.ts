import { container } from "tsyringe";
import * as blueprints from "../../blueprints";
import { ActionPriority } from "../../types/ActionPriority";
import { IActionResult } from "../../types/ActionTypes";
import { ActionQueue } from "../ActionQueue";

jest.mock("../../blueprints");

describe("ActionQueue", () => {
  let actionQueue: ActionQueue;

  beforeEach(() => {
    actionQueue = container.resolve(ActionQueue);
    actionQueue.clear();
    jest.resetAllMocks();
  });

  const mockGetBlueprint = (mockReturnValue: any) => {
    (blueprints.getBlueprint as jest.Mock).mockImplementation(
      (type: string) =>
        mockReturnValue[type] || {
          priority: ActionPriority.LOW,
          requiresProcessing: false,
        },
    );
  };

  it("should enqueue an action with default priority and processing requirement", () => {
    mockGetBlueprint({});
    actionQueue.enqueue("testAction", "testContent");
    const action = actionQueue.dequeue();
    expect(action).toEqual({
      type: "testAction",
      content: "testContent",
      priority: ActionPriority.LOW,
      requiresProcessing: false,
    });
  });

  it("should enqueue an action with specified priority and processing requirement", () => {
    mockGetBlueprint({
      testAction: { priority: ActionPriority.HIGH, requiresProcessing: true },
    });

    actionQueue.enqueue("testAction", "testContent");
    const action = actionQueue.dequeue();
    expect(action).toEqual({
      type: "testAction",
      content: "testContent",
      priority: ActionPriority.HIGH,
      requiresProcessing: true,
    });
  });

  it("should dequeue actions in order of priority", () => {
    mockGetBlueprint({
      lowPriorityAction: {
        priority: ActionPriority.LOW,
        requiresProcessing: false,
      },
      highPriorityAction: {
        priority: ActionPriority.HIGH,
        requiresProcessing: false,
      },
    });

    actionQueue.enqueue("lowPriorityAction", "lowContent");
    actionQueue.enqueue("highPriorityAction", "highContent");

    const highPriorityAction = actionQueue.dequeue();
    const lowPriorityAction = actionQueue.dequeue();

    expect(highPriorityAction?.type).toBe("highPriorityAction");
    expect(lowPriorityAction?.type).toBe("lowPriorityAction");
  });

  it("should prioritize processing actions until they are completed", () => {
    mockGetBlueprint({
      processingAction: {
        priority: ActionPriority.LOW,
        requiresProcessing: true,
      },
      normalAction: { priority: ActionPriority.LOW, requiresProcessing: false },
    });

    actionQueue.enqueue("processingAction", "processingContent");
    actionQueue.enqueue("normalAction", "normalContent");

    // First dequeue should return the processing action
    const firstAction = actionQueue.dequeue();
    expect(firstAction?.type).toBe("processingAction");

    // Second dequeue should return the same processing action since it's not completed
    const secondAction = actionQueue.dequeue();
    expect(secondAction?.type).toBe("processingAction");

    // After setting result, normal action can be dequeued
    actionQueue.setActionResult("processingAction", "processingContent", {
      success: true,
      data: "result",
    });
    const thirdAction = actionQueue.dequeue();
    expect(thirdAction?.type).toBe("normalAction");
  });

  it("should set action result and store processed results if required", () => {
    mockGetBlueprint({
      processingAction: {
        priority: ActionPriority.LOW,
        requiresProcessing: true,
      },
    });

    actionQueue.enqueue("processingAction", "processingContent");

    const result: IActionResult = { success: true, data: "processedData" };
    actionQueue.setActionResult(
      "processingAction",
      "processingContent",
      result,
    );

    const processedResults = actionQueue.getProcessedResults();
    expect(processedResults.get("processingAction:processingContent")).toBe(
      "processedData",
    );
  });

  it("should check if the queue is empty", () => {
    mockGetBlueprint({});
    expect(actionQueue.isEmpty()).toBe(true);
    actionQueue.enqueue("testAction", "testContent");
    expect(actionQueue.isEmpty()).toBe(false);
  });

  it("should get the size of the queue", () => {
    mockGetBlueprint({});
    expect(actionQueue.size()).toBe(0);
    actionQueue.enqueue("testAction", "testContent");
    expect(actionQueue.size()).toBe(1);
  });

  it("should clear the queue and processed results", () => {
    mockGetBlueprint({});
    actionQueue.enqueue("testAction", "testContent");
    const result: IActionResult = { success: true, data: "processedData" };
    actionQueue.setActionResult("testAction", "testContent", result);

    actionQueue.clear();
    expect(actionQueue.isEmpty()).toBe(true);
    expect(actionQueue.size()).toBe(0);
    expect(actionQueue.getProcessedResults().size).toBe(0);
  });

  it("should handle enqueuing actions with the same type and content", () => {
    mockGetBlueprint({});
    actionQueue.enqueue("testAction", "testContent");
    actionQueue.enqueue("testAction", "testContent");

    expect(actionQueue.size()).toBe(2);

    const action1 = actionQueue.dequeue();
    const action2 = actionQueue.dequeue();

    expect(action1).toEqual({
      type: "testAction",
      content: "testContent",
      priority: ActionPriority.LOW,
      requiresProcessing: false,
    });

    expect(action2).toEqual({
      type: "testAction",
      content: "testContent",
      priority: ActionPriority.LOW,
      requiresProcessing: false,
    });
  });

  it("should return undefined when dequeuing from an empty queue", () => {
    mockGetBlueprint({});
    const action = actionQueue.dequeue();
    expect(action).toBeUndefined();
  });

  it("should handle actions with CRITICAL priority", () => {
    mockGetBlueprint({
      criticalAction: {
        priority: ActionPriority.CRITICAL,
        requiresProcessing: false,
      },
      normalAction: { priority: ActionPriority.LOW, requiresProcessing: false },
    });

    actionQueue.enqueue("normalAction", "normalContent");
    actionQueue.enqueue("criticalAction", "criticalContent");

    const criticalAction = actionQueue.dequeue();
    expect(criticalAction?.type).toBe("criticalAction");
  });

  it("should handle actions with LOWEST priority", () => {
    mockGetBlueprint({
      lowestAction: {
        priority: ActionPriority.LOWEST,
        requiresProcessing: false,
      },
      normalAction: { priority: ActionPriority.LOW, requiresProcessing: false },
    });

    actionQueue.enqueue("normalAction", "normalContent");
    actionQueue.enqueue("lowestAction", "lowestContent");

    const normalAction = actionQueue.dequeue();
    expect(normalAction?.type).toBe("normalAction");

    const lowestAction = actionQueue.dequeue();
    expect(lowestAction?.type).toBe("lowestAction");
  });

  it("should not remove actions from the queue if they are not completed", () => {
    mockGetBlueprint({
      processingAction: {
        priority: ActionPriority.LOW,
        requiresProcessing: true,
      },
    });

    actionQueue.enqueue("processingAction", "processingContent");
    const dequeuedAction = actionQueue.dequeue();

    expect(dequeuedAction).toEqual({
      type: "processingAction",
      content: "processingContent",
      priority: ActionPriority.LOW,
      requiresProcessing: true,
    });
    expect(actionQueue.size()).toBe(1); // Action is still in the queue

    actionQueue.setActionResult("processingAction", "processingContent", {
      success: false,
      error: new Error("Processing failed"),
    });

    expect(actionQueue.size()).toBe(1); // Action remains in the queue
  });

  it("should handle actions with different priorities and processing requirements", () => {
    mockGetBlueprint({
      criticalAction: {
        priority: ActionPriority.CRITICAL,
        requiresProcessing: true,
      },
      highAction: { priority: ActionPriority.HIGH, requiresProcessing: false },
      mediumAction: {
        priority: ActionPriority.MEDIUM,
        requiresProcessing: true,
      },
      lowAction: { priority: ActionPriority.LOW, requiresProcessing: false },
      lowestAction: {
        priority: ActionPriority.LOWEST,
        requiresProcessing: true,
      },
    });

    actionQueue.enqueue("criticalAction", "criticalContent");
    actionQueue.enqueue("highAction", "highContent");
    actionQueue.enqueue("mediumAction", "mediumContent");
    actionQueue.enqueue("lowAction", "lowContent");
    actionQueue.enqueue("lowestAction", "lowestContent");

    // Dequeue the critical action
    const criticalAction = actionQueue.dequeue();
    expect(criticalAction?.type).toBe("criticalAction");

    // Mark the critical action as processed
    actionQueue.setActionResult("criticalAction", "criticalContent", {
      success: true,
      data: "processedCriticalData",
    });

    // Now dequeue the high action
    const highAction = actionQueue.dequeue();
    expect(highAction?.type).toBe("highAction");

    // Continue with the rest of the actions
    const mediumAction = actionQueue.dequeue();
    expect(mediumAction?.type).toBe("mediumAction");

    // Mark the medium action as processed
    actionQueue.setActionResult("mediumAction", "mediumContent", {
      success: true,
      data: "processedMediumData",
    });

    const lowAction = actionQueue.dequeue();
    expect(lowAction?.type).toBe("lowAction");

    const lowestAction = actionQueue.dequeue();
    expect(lowestAction?.type).toBe("lowestAction");
  });
});
