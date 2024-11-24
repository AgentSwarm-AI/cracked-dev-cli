import { autoInjectable } from "tsyringe";
import { ActionTagsExtractor } from "./ActionTagsExtractor";
import { endTaskAction as blueprint } from "./blueprints/endTaskAction";
import { BaseAction } from "./core/BaseAction";
import { IActionMetadata } from "./core/IAction";
import { IActionResult } from "./types/ActionTypes";

interface EndTaskParams {
  message: string;
}

@autoInjectable()
export class EndTaskAction extends BaseAction {
  constructor(protected actionTagsExtractor: ActionTagsExtractor) {
    super(actionTagsExtractor);
  }

  protected getBlueprint(): IActionMetadata {
    return blueprint;
  }

  protected validateParams(params: Record<string, any>): string | null {
    const { message } = params as EndTaskParams;

    if (!message) {
      return "No message provided";
    }

    return null;
  }

  protected async executeInternal(
    params: Record<string, any>,
  ): Promise<IActionResult> {
    const { message } = params as EndTaskParams;

    this.logInfo(`End task message: ${message}`);
    return this.createSuccessResult(message);
  }
}
