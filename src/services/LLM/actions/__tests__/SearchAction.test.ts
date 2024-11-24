import { FileSearch } from "@services/FileManagement/FileSearch";
import { IFileSearchResult } from "@services/FileManagement/types/FileManagementTypes";
import { ActionTagsExtractor } from "@services/LLM/actions/ActionTagsExtractor";
import { SearchAction } from "@services/LLM/actions/SearchAction";
import { container } from "tsyringe";

// Create mock classes
class MockFileSearch {
  findByContent = jest.fn();
  findByName = jest.fn();
}

class MockActionTagsExtractor {
  extractTag = jest.fn();
}

// Mock both classes
jest.mock("@services/FileManagement/FileSearch", () => ({
  FileSearch: jest.fn().mockImplementation(() => new MockFileSearch()),
}));

jest.mock("@services/LLM/actions/ActionTagsExtractor", () => ({
  ActionTagsExtractor: jest
    .fn()
    .mockImplementation(() => new MockActionTagsExtractor()),
}));

describe("SearchAction", () => {
  let searchAction: SearchAction;
  let fileSearch: MockFileSearch;
  let actionTagsExtractor: MockActionTagsExtractor;

  beforeEach(() => {
    jest.clearAllMocks();
    container.clearInstances();

    // Create new instances of our mocks
    fileSearch = new MockFileSearch();
    actionTagsExtractor = new MockActionTagsExtractor();

    // Register the mocks with the container
    container.registerInstance(FileSearch, fileSearch as unknown as FileSearch);
    container.registerInstance(
      ActionTagsExtractor,
      actionTagsExtractor as unknown as ActionTagsExtractor,
    );

    // Set up default mock behavior for ActionTagsExtractor
    actionTagsExtractor.extractTag.mockImplementation((content, tag) => {
      if (content.includes(`<${tag}>`)) {
        const match = content.match(new RegExp(`<${tag}>(.*?)</${tag}>`, "s"));
        return match ? match[1].trim() : null;
      }
      return null;
    });

    // Resolve SearchAction which will now use our mocks
    searchAction = container.resolve(SearchAction);
  });

  describe("search_string", () => {
    it("should search content successfully with valid parameters", async () => {
      const mockResults: IFileSearchResult[] = [
        {
          path: "src/file1.ts",
          matches: [{ line: 1, content: "someContent" }],
        },
        {
          path: "src/file2.ts",
          matches: [{ line: 5, content: "someContent" }],
        },
      ];
      fileSearch.findByContent.mockResolvedValue(mockResults);

      const result = await searchAction.execute(`
        <search_string>
          <directory>src</directory>
          <term>someContent</term>
        </search_string>
      `);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResults);
      expect(fileSearch.findByContent).toHaveBeenCalledWith(
        "someContent",
        "src",
      );
    });

    it("should handle empty search results", async () => {
      fileSearch.findByContent.mockResolvedValue([]);

      const result = await searchAction.execute(`
        <search_string>
          <directory>src</directory>
          <term>nonexistent</term>
        </search_string>
      `);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe("search_file", () => {
    it("should search files successfully with valid parameters", async () => {
      const mockResults = ["src/file1.ts", "src/file2.ts"];
      fileSearch.findByName.mockResolvedValue(mockResults);

      const result = await searchAction.execute(`
        <search_file>
          <directory>src</directory>
          <term>*.ts</term>
        </search_file>
      `);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResults);
      expect(fileSearch.findByName).toHaveBeenCalledWith("*.ts", "src");
    });

    it("should handle empty search results", async () => {
      fileSearch.findByName.mockResolvedValue([]);

      const result = await searchAction.execute(`
        <search_file>
          <directory>src</directory>
          <term>nonexistent</term>
        </search_file>
      `);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe("validation", () => {
    it("should fail when directory is missing", async () => {
      const result = await searchAction.execute(`
        <search_file>
          <term>test</term>
        </search_file>
      `);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("No directory provided");
    });

    it("should fail when term is missing", async () => {
      const result = await searchAction.execute(`
        <search_file>
          <directory>src</directory>
        </search_file>
      `);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("No search term provided");
    });

    it("should handle whitespace in parameters", async () => {
      fileSearch.findByName.mockResolvedValue(["src/test/result.ts"]);

      const result = await searchAction.execute(`
        <search_file>
          <directory>
            src/test
          </directory>
          <term>
            test file
          </term>
        </search_file>
      `);

      expect(result.success).toBe(true);
      expect(fileSearch.findByName).toHaveBeenCalledWith(
        "test file",
        "src/test",
      );
    });
  });
});
