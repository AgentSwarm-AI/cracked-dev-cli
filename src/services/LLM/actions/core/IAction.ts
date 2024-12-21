import { ActionTagsExtractor } from "../ActionTagsExtractor";
import { IActionResult, ValidatorFn } from "../types/ActionTypes";

export interface IActionParameter {
  name: string;
  required: boolean;
  description: string;
  validator?: ValidatorFn;
  mayContainNestedContent?: boolean;
}

// Base interface that all actions must implement
export interface IAction {
  execute(...args: unknown[]): Promise<IActionResult>;
}

// Type for action constructors with flexible dependencies
export type ActionConstructor = {
  new (
    actionTagsExtractor: ActionTagsExtractor,
    ...dependencies: any[]
  ): IAction;
};

export interface IActionBlueprint {
  tag: string;
  class: ActionConstructor;
  description: string;
  usageExplanation: string;
  parameters?: IActionParameter[];
  canRunInParallel?: boolean;
  priority?: number;
  requiresProcessing?: boolean;
}
