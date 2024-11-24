import { IActionResult } from "../types/ActionTypes";

export interface IActionParameter {
  name: string;
  required: boolean;
  description: string;
  validator?: (value: any) => boolean;
  mayContainNestedContent?: boolean;
}

export interface IActionBlueprint {
  tag: string;
  class: any;
  description: string;
  parameters?: IActionParameter[];
  canRunInParallel?: boolean;
  priority?: number;
}

export interface IAction {
  execute(...args: any[]): Promise<IActionResult>;
}
