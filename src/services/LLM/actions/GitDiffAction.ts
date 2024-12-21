import { ConfigService } from "@/services/ConfigService";
import { GitService } from "@/services/GitManagement/GitService";
import { ActionTagsExtractor } from "@/services/LLM/actions/ActionTagsExtractor";
import { BaseAction } from "@/services/LLM/actions/core/BaseAction";
import { IActionBlueprint } from "@/services/LLM/actions/core/IAction";
import { IActionResult } from "@/services/LLM/actions/types/ActionTypes";
import { autoInjectable } from "tsyringe";
import { gitDiffActionBlueprint as blueprint } from "./blueprints/gitDiffActionBlueprint";

interface IGitDiffParams {
  fromCommit: string;
  toCommit: string;
}

@autoInjectable()
export class GitDiffAction extends BaseAction {
  constructor(
    protected actionTagsExtractor: ActionTagsExtractor,
    private gitService: GitService,
    private configService: ConfigService,
  ) {
    super(actionTagsExtractor);
  }

  protected getBlueprint(): IActionBlueprint {
    return blueprint;
  }

  protected parseParams(content: string): Record<string, any> {
    const tag = this.getBlueprint().tag;
    const match = content.match(new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`));
    if (!match) {
      throw new Error("Failed to parse git diff content");
    }

    const tagContent = match[0];
    const fromCommit = this.actionTagsExtractor.extractTag(
      tagContent,
      "fromCommit",
    );
    const toCommit = this.actionTagsExtractor.extractTag(
      tagContent,
      "toCommit",
    );

    const getValue = (value: string | string[] | null): string => {
      if (!value) return "";
      return Array.isArray(value) ? value[0]?.trim() || "" : value.trim();
    };

    return {
      fromCommit: getValue(fromCommit),
      toCommit: getValue(toCommit),
    };
  }

  protected validateParams(params: Record<string, any>): string | null {
    const { fromCommit, toCommit } = params as IGitDiffParams;

    if (!fromCommit || typeof fromCommit !== "string") {
      return "fromCommit is required and must be a non-empty string";
    }

    if (!toCommit || typeof toCommit !== "string") {
      return "toCommit is required and must be a non-empty string";
    }

    return null;
  }

  protected async executeInternal(
    params: IGitDiffParams,
  ): Promise<IActionResult> {
    try {
      const config = this.configService.getConfig();
      const { excludeLockFiles, lockFiles } = config.gitDiff;

      const excludePattern = excludeLockFiles
        ? lockFiles.map((file) => `:!${file}`).join(" ")
        : "";

      const diff = await this.gitService.getDiff(
        params.fromCommit,
        params.toCommit,
        excludePattern,
      );
      return this.createSuccessResult(diff);
    } catch (error) {
      return this.createErrorResult(error);
    }
  }
}
