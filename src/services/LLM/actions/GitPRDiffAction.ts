import { GitService } from "@/services/GitManagement/GitService";
import { ActionTagsExtractor } from "@/services/LLM/actions/ActionTagsExtractor";
import { BaseAction } from "@/services/LLM/actions/core/BaseAction";
import { IActionBlueprint } from "@/services/LLM/actions/core/IAction";
import { IActionResult } from "@/services/LLM/actions/types/ActionTypes";
import { DebugLogger } from "@/services/logging/DebugLogger";
import { autoInjectable } from "tsyringe";
import { gitPRDiffActionBlueprint as blueprint } from "./blueprints/gitPRDiffActionBlueprint";

interface IGitPRDiffParams {
  baseBranch: string;
  compareBranch: string;
}

@autoInjectable()
export class GitPRDiffAction extends BaseAction {
  protected validateParams(params: Record<string, any>): string | null {
    if (typeof params.baseBranch !== "string" || !params.baseBranch.trim()) {
      return "baseBranch is required and must be a non-empty string";
    }
    if (
      typeof params.compareBranch !== "string" ||
      !params.compareBranch.trim()
    ) {
      return "compareBranch is required and must be a non-empty string";
    }
    return null;
  }

  public execute(content: string): Promise<IActionResult> {
    try {
      const params: IGitPRDiffParams = JSON.parse(content);
      const validationError = this.validateParams(params);
      if (validationError) {
        return Promise.reject(validationError);
      }
      return this.executeInternal(params);
    } catch (error) {
      return Promise.reject("Invalid JSON content");
    }
  }

  protected getBlueprint(): IActionBlueprint {
    return blueprint;
  }

  constructor(
    protected actionTagsExtractor: ActionTagsExtractor,
    private gitService: GitService,
    private debugLogger: DebugLogger,
  ) {
    super(actionTagsExtractor);
  }

  protected async executeInternal(
    params: IGitPRDiffParams,
  ): Promise<IActionResult> {
    try {
      const diff = await this.gitService.getPRDiff(
        params.baseBranch,
        params.compareBranch,
      );
      return this.createSuccessResult(diff);
    } catch (error) {
      return this.createErrorResult(error);
    }
  }
}
