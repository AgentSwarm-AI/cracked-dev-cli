import { autoInjectable } from "tsyringe";
import { PhaseTransitionService } from "../PhaseTransitionService";
import { ActionTagsExtractor } from "./ActionTagsExtractor";
import { endPhaseActionBlueprint } from "./blueprints/endPhaseActionBlueprint";
import { BaseAction } from "./core/BaseAction";
import { IActionBlueprint } from "./core/IAction";
import { IActionResult } from "./types/ActionTypes";

@autoInjectable()
export class EndPhaseAction extends BaseAction {
  constructor(
    actionTagsExtractor: ActionTagsExtractor,
    private phaseTransitionService: PhaseTransitionService,
  ) {
    super(actionTagsExtractor);
  }

  protected async executeInternal(
    params: Record<string, any>,
  ): Promise<IActionResult> {
    try {
      const data = await this.phaseTransitionService.transitionToNextPhase();
      return this.createSuccessResult(data);
    } catch (error) {
      return this.createErrorResult(error);
    }
  }

  protected validateParams(params: Record<string, any>): string | null {
    // No params to validate
    return null;
  }

  protected getBlueprint(): IActionBlueprint {
    return endPhaseActionBlueprint;
  }
}
