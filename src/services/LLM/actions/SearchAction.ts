import { FileSearch } from "@services/FileManagement/FileSearch";
import { autoInjectable } from "tsyringe";
import { ActionTagsExtractor } from "./ActionTagsExtractor";
import {
  searchFileAction,
  searchStringAction,
} from "./blueprints/searchActions";
import { BaseAction } from "./core/BaseAction";
import { IActionMetadata } from "./core/IAction";
import { IActionResult } from "./types/ActionTypes";

interface SearchParams {
  directory: string;
  term: string;
  type: "search_string" | "search_file";
}

@autoInjectable()
export class SearchAction extends BaseAction {
  private currentType: "search_string" | "search_file" = "search_file";

  constructor(
    protected actionTagsExtractor: ActionTagsExtractor,
    private fileSearch: FileSearch,
  ) {
    super(actionTagsExtractor);
  }

  async execute(content: string): Promise<IActionResult> {
    // Determine action type from the content
    this.currentType = content.includes("<search_string>")
      ? "search_string"
      : "search_file";
    return super.execute(content);
  }

  protected getBlueprint(): IActionMetadata {
    return this.currentType === "search_string"
      ? searchStringAction
      : searchFileAction;
  }

  protected parseParams(content: string): Record<string, any> {
    // First extract the content from the outer tag (search_string or search_file)
    const tag = this.getBlueprint().tag;
    const match = content.match(new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`));
    if (!match) {
      this.logError("Failed to parse search content");
      return { directory: "", term: "" };
    }

    const tagContent = match[0];
    const directory = this.actionTagsExtractor.extractTag(
      tagContent,
      "directory",
    );
    const term = this.actionTagsExtractor.extractTag(tagContent, "term");

    const getValue = (value: string | string[] | null): string => {
      if (!value) return "";
      return Array.isArray(value) ? value[0]?.trim() || "" : value.trim();
    };

    return {
      directory: getValue(directory),
      term: getValue(term),
    };
  }

  protected validateParams(params: Record<string, any>): string | null {
    const { directory, term } = params as SearchParams;

    if (!directory) {
      return "No directory provided";
    }
    if (!term) {
      return "No search term provided";
    }

    return null;
  }

  protected async executeInternal(
    params: Record<string, any>,
  ): Promise<IActionResult> {
    try {
      const { directory, term } = params as SearchParams;

      this.logInfo(`Searching in directory: ${directory}`);
      this.logInfo(`Search term: ${term}`);
      this.logInfo(`Search type: ${this.currentType}`);

      let results;
      if (this.currentType === "search_string") {
        results = await this.fileSearch.findByContent(term, directory);
      } else {
        results = await this.fileSearch.findByName(term, directory);
      }

      if (!results || results.length === 0) {
        this.logInfo("No results found");
        return this.createSuccessResult([]);
      }

      this.logSuccess(`Found ${results.length} results`);
      return this.createSuccessResult(results);
    } catch (error) {
      this.logError(`Search failed: ${(error as Error).message}`);
      return this.createErrorResult(error as Error);
    }
  }
}
