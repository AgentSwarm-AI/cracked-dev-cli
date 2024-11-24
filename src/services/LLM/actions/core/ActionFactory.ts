import { autoInjectable, container } from "tsyringe";
import {
  actionsBlueprints,
  ActionTag,
  getImplementedActions,
} from "../blueprints";
import { IAction, IActionBlueprint } from "./IAction";

@autoInjectable()
export class ActionFactory {
  private blueprintCache: Map<string, IActionBlueprint> = new Map();
  private instanceCache: Map<string, IAction> = new Map();

  constructor() {
    // Initialize blueprint cache with only implemented actions
    const implementedActions = getImplementedActions();
    implementedActions.forEach((tag) => {
      const blueprint = actionsBlueprints[tag];
      if (blueprint) {
        this.blueprintCache.set(tag, blueprint);
      }
    });
  }

  getBlueprint(tag: string): IActionBlueprint | undefined {
    return this.blueprintCache.get(tag);
  }

  getAllBlueprints(): IActionBlueprint[] {
    return Array.from(this.blueprintCache.values());
  }

  createAction(tag: ActionTag): IAction | undefined {
    // Check instance cache first
    if (this.instanceCache.has(tag)) {
      return this.instanceCache.get(tag);
    }

    const blueprint = this.getBlueprint(tag);
    if (!blueprint || !blueprint.class) {
      return undefined;
    }

    try {
      // Create new instance using tsyringe container
      const instance = container.resolve(blueprint.class) as IAction;
      this.instanceCache.set(tag, instance);
      return instance;
    } catch (error) {
      console.error(`Failed to create action instance for ${tag}:`, error);
      return undefined;
    }
  }

  validateParameters(tag: string, params: Record<string, any>): string | null {
    const blueprint = this.getBlueprint(tag);
    if (!blueprint) {
      return `Unknown action type: ${tag}`;
    }

    if (!blueprint.parameters) {
      return null;
    }

    for (const param of blueprint.parameters) {
      if (param.required && !(param.name in params)) {
        return `Missing required parameter: ${param.name}`;
      }

      if (param.validator && params[param.name] !== undefined) {
        const isValid = param.validator(params[param.name]);
        if (!isValid) {
          return `Invalid value for parameter: ${param.name}`;
        }
      }
    }

    return null;
  }
}
