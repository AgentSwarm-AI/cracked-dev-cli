import { FileSearch } from "@services/FileManagement/FileSearch";
import { ActionTagsExtractor } from "@services/LLM/actions/ActionTagsExtractor";
import { IActionResult } from "@services/LLM/actions/types/ActionTypes";
import { autoInjectable } from "tsyringe";

@autoInjectable()
export class SearchAction {
  constructor(
    private fileSearch: FileSearch,
    private actionTagsExtractor: ActionTagsExtractor,
  ) {}

  async execute(type: string, content: string): Promise<IActionResult> {
    const directory = this.actionTagsExtractor.extractTag(content, "directory");
    const searchTerm = this.actionTagsExtractor.extractTag(content, "term");

    if (!directory || !searchTerm) {
      throw new Error(
        "Invalid search format. Must include both <directory> and <term> tags.",
      );
    }

    try {
      let results;
      if (type === "search_string") {
        results = await this.fileSearch.findByContent(searchTerm, directory);
      } else {
        // search_file
        results = await this.fileSearch.findByName(searchTerm, directory);
      }

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
  }
}
