import { fetch_url } from "@services/FileManagement/FetchUtil";
import { autoInjectable } from "tsyringe";
import { ActionTagsExtractor } from "./ActionTagsExtractor";
import { fetchUrlAction as blueprint } from "./blueprints/fetchUrlAction";
import { BaseAction } from "./core/BaseAction";
import { IActionMetadata } from "./core/IAction";
import { IActionResult } from "./types/ActionTypes";

interface FetchUrlParams {
  url: string;
}

@autoInjectable()
export class FetchUrlAction extends BaseAction {
  constructor(protected actionTagsExtractor: ActionTagsExtractor) {
    super(actionTagsExtractor);
  }

  protected getBlueprint(): IActionMetadata {
    return blueprint;
  }

  protected validateParams(params: Record<string, any>): string | null {
    const { url } = params as FetchUrlParams;

    if (!url) {
      return "No URL provided";
    }

    try {
      new URL(url); // Validate URL format
      return null;
    } catch {
      return "Invalid URL format. Must be a valid URL with protocol (http:// or https://)";
    }
  }

  protected async executeInternal(
    params: Record<string, any>,
  ): Promise<IActionResult> {
    try {
      const { url } = params as FetchUrlParams;

      this.logInfo(`Fetching URL: ${url}`);

      const data = await fetch_url(url);
      return this.createSuccessResult(data);
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error : new Error("Failed to fetch URL"),
      );
    }
  }
}
