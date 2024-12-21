import { autoInjectable } from "tsyringe";
import { ActionTagsExtractor } from "./ActionTagsExtractor";
import { actionExplainerBlueprint } from "./blueprints/actionExplainerBlueprint";
import { ActionExplainer } from "./core/ActionExplainer";
import { BaseAction } from "./core/BaseAction";
import { IActionBlueprint } from "./core/IAction";
import { IActionResult } from "./types/ActionTypes";

@autoInjectable()
export class ActionExplainerAction extends BaseAction {
  constructor(
    protected actionTagsExtractor: ActionTagsExtractor,
    private actionExplainer: ActionExplainer,
  ) {
    super(actionTagsExtractor);
  }

  protected getBlueprint(): IActionBlueprint {
    return actionExplainerBlueprint;
  }

  protected validateParams(params: Record<string, any>): string | null {
    if (!params.action) {
      return "Missing required parameter: action";
    }
    return null;
  }

  protected parseParams(content: string): Record<string, any> {
    // Extract only the action name from inside the action tag
    const actionMatch = content.match(/<action>(.*?)<\/action>/s);
    if (!actionMatch) {
      return { action: null };
    }
    return { action: actionMatch[1].trim() };
  }

  protected async executeInternal(
    params: Record<string, any>,
  ): Promise<IActionResult> {
    try {
      const explanation = this.actionExplainer.explainAction(params.action);
      return {
        success: true,
        data: explanation,
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
  }
}
