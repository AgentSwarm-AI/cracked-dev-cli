import { FileSearch } from "../../../FileManagement/FileSearch";
import { ActionTagsExtractor } from "../ActionTagsExtractor";
import { SearchAction } from "../SearchAction";

describe("SearchAction", () => {
  let searchAction: SearchAction;
  let actionTagsExtractor: ActionTagsExtractor;
  let fileSearch: FileSearch;

  beforeEach(() => {
    actionTagsExtractor = new ActionTagsExtractor(); // Providing necessary dependencies
    fileSearch = new FileSearch(); // Assuming correct constructor here
    searchAction = new SearchAction(fileSearch, actionTagsExtractor);
  });

  it("should search successfully with a valid query", async () => {
    const results = await searchAction.execute(
      "search_string",
      "<directory>/some/directory</directory><term>someTerm</term>",
    );
    expect(results.success).toBe(true); // Adjust based on actual implementation
  });

  it("should throw an error for an invalid search query", async () => {
    await expect(searchAction.execute("search_string", "")).rejects.toThrow(
      "Invalid search format. Must include both <directory> and <term> tags.",
    );
  });
});
