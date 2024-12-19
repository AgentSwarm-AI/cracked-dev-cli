import { GitService } from "@/services/GitManagement/GitService";
import { ActionTagsExtractor } from "@/services/LLM/actions/ActionTagsExtractor";
import { BaseAction } from "@/services/LLM/actions/core/BaseAction";
import { IActionBlueprint } from "@/services/LLM/actions/core/IAction";
import { IActionResult } from "@/services/LLM/actions/types/ActionTypes";
import { DebugLogger } from "@/services/logging/DebugLogger";
import { autoInjectable } from "tsyringe";
import { gitDiffActionBlueprint as blueprint } from "./blueprints/gitDiffActionBlueprint";

interface IGitDiffParams {
  path?: string;
}

@autoInjectable()
export class GitDiffAction extends BaseAction {
  protected validateParams(params: Record<string, any>): string | null {
    const { path } = params as IGitDiffParams;

    // Path is optional for full repository diff, but if provided, it must be a string
    if (path !== undefined && typeof path !== "string") {
      return "Path must be a string if provided";
    }

    return null;
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

  async execute(content: string): Promise<IActionResult> {
    // Validate XML structure first
    const structureError = this.actionTagsExtractor.validateStructure(content);
    if (structureError) {
      return this.createErrorResult(structureError);
    }

    return super.execute(content);
  }

  protected async executeInternal(
    params: IGitDiffParams,
  ): Promise<IActionResult> {
    try {
      const diff = await this.gitService.getDiff(params.path);
      return this.createSuccessResult(diff);
    } catch (error) {
      return this.createErrorResult(error);
    }
  }
}
