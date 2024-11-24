import { autoInjectable } from "tsyringe";
import { ActionTagsExtractor } from "./ActionTagsExtractor";
import { endTaskActionBlueprint as blueprint } from "./blueprints/endTaskActionBlueprint";
import { BaseAction } from "./core/BaseAction";
import { IActionBlueprint } from "./core/IAction";
import { IActionResult } from "./types/ActionTypes";

@autoInjectable()
export class EndTaskAction extends BaseAction {
  constructor(protected actionTagsExtractor: ActionTagsExtractor) {
    super(actionTagsExtractor);
  }

  protected getBlueprint(): IActionBlueprint {
    return blueprint;
  }

  protected validateParams(params: Record<string, any>): string | null {
    const content = params.content as string;

    if (!content?.trim()) {
      return "No message provided";
    }

    return null;
  }

  protected async executeInternal(
    params: Record<string, any>,
  ): Promise<IActionResult> {
    const message = params.content as string;

    this.logInfo(`End task message: ${message}`);
    return this.createSuccessResult(message);
  }

  protected parseParams(content: string): Record<string, any> {
    // Extract the content between the end_task tags
    const match = content.match(/<end_task>([\s\S]*?)<\/end_task>/);
    return { content: match?.[1]?.trim() };
  }
}
