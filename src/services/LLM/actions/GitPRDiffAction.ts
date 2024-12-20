import { ConfigService } from "@/services/ConfigService";
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
  constructor(
    protected actionTagsExtractor: ActionTagsExtractor,
    private gitService: GitService,
    private debugLogger: DebugLogger,
    private configService: ConfigService,
  ) {
    super(actionTagsExtractor);
  }

  protected getBlueprint(): IActionBlueprint {
    return blueprint;
  }

  protected parseParams(content: string): Record<string, any> {
    // First extract the content from the outer tag
    const tag = this.getBlueprint().tag;
    const match = content.match(new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`));
    if (!match) {
      throw new Error("Failed to parse git PR diff content");
    }

    const tagContent = match[0];
    const baseBranch = this.actionTagsExtractor.extractTag(
      tagContent,
      "baseBranch",
    );
    const compareBranch = this.actionTagsExtractor.extractTag(
      tagContent,
      "compareBranch",
    );

    const getValue = (value: string | string[] | null): string => {
      if (!value) return "";
      return Array.isArray(value) ? value[0]?.trim() || "" : value.trim();
    };

    return {
      baseBranch: getValue(baseBranch),
      compareBranch: getValue(compareBranch),
    };
  }

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

  protected async executeInternal(
    params: IGitPRDiffParams,
  ): Promise<IActionResult> {
    try {
      const config = this.configService.getConfig();
      const { excludeLockFiles, lockFiles } = config.gitDiff;

      // Only create exclude pattern if excludeLockFiles is true
      const excludePattern = excludeLockFiles
        ? lockFiles.map((file) => `:!${file}`).join(" ")
        : "";

      // Warn if we're trying to use exclude patterns
      if (excludePattern) {
        console.warn(
          "Warning: File exclusion patterns are not supported for PR diffs. The pattern will be ignored.",
        );
      }

      const diff = await this.gitService.getPRDiff(
        params.baseBranch,
        params.compareBranch,
        excludePattern,
      );
      return this.createSuccessResult(diff);
    } catch (error) {
      return this.createErrorResult(error);
    }
  }
}
