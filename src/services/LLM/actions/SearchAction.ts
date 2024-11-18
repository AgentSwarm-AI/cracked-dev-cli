import { autoInjectable } from "tsyringe";
import { FileSearch } from "../../FileManagement/FileSearch";
import { ActionTagsExtractor } from "./ActionTagsExtractor";
import { IActionResult } from "./types/ActionTypes";

@autoInjectable()
export class SearchAction {
  constructor(
    private fileSearch: FileSearch,
    private actionTagsExtractor: ActionTagsExtractor,
  ) {}

  async execute(type: string, content: string): Promise<IActionResult> {
    try {
      const directory = this.actionTagsExtractor.extractTag(
        content,
        "directory",
      );
      const searchTerm = this.actionTagsExtractor.extractTag(content, "term");

      if (!directory || !searchTerm) {
        return {
          success: false,
          error: new Error(
            "Invalid search format. Must include both <directory> and <term> tags.",
          ),
        };
      }

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
