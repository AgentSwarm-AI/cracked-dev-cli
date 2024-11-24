import axios, { AxiosResponse } from "axios";
import { autoInjectable } from "tsyringe";
import { ActionTagsExtractor } from "./ActionTagsExtractor";
import { fetchUrlActionBlueprint as blueprint } from "./blueprints/fetchUrlActionBlueprint";
import { BaseAction } from "./core/BaseAction";
import { IActionBlueprint } from "./core/IAction";
import { IActionResult } from "./types/ActionTypes";

interface FetchUrlParams {
  url: string;
}

@autoInjectable()
export class FetchUrlAction extends BaseAction {
  constructor(protected actionTagsExtractor: ActionTagsExtractor) {
    super(actionTagsExtractor);
  }

  protected getBlueprint(): IActionBlueprint {
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

      const data = await this.fetchUrl(url);
      return this.createSuccessResult(data);
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error : new Error("Failed to fetch URL"),
      );
    }
  }

  private async fetchUrl<T = any>(url: string): Promise<T> {
    try {
      const response: AxiosResponse<T> = await axios.get(url);
      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Network error: ${error.message}`);
      }
      throw new Error(`Error fetching URL: ${error.message}`);
    }
  }
}
