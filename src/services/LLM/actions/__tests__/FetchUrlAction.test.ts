import { container } from "tsyringe";
import { FetchUrlAction } from "@services/LLM/actions/FetchUrlAction";
import { ActionTagsExtractor } from "@services/LLM/actions/ActionTagsExtractor";
import { fetch_url } from "@services/FileManagement/FetchUtil";

jest.mock("@services/FileManagement/FetchUtil");

describe("FetchUrlAction", () => {
  let fetchUrlAction: FetchUrlAction;
  let actionTagsExtractor: ActionTagsExtractor;

  beforeEach(() => {
    jest.clearAllMocks();
    actionTagsExtractor = container.resolve(ActionTagsExtractor);
    fetchUrlAction = container.resolve(FetchUrlAction);
  });

  describe("execute", () => {
    it("should fetch URL successfully with valid parameters", async () => {
      const mockData = "Mock Data";
      (fetch_url as jest.Mock).mockResolvedValue(mockData);

      const result = await fetchUrlAction.execute(`
        <fetch_url>
          <url>http://example.com</url>
        </fetch_url>
      `);

      expect(result.success).toBe(true);
      expect(result.data).toBe(mockData);
      expect(fetch_url).toHaveBeenCalledWith("http://example.com");
    });

    it("should handle invalid URL format", async () => {
      const result = await fetchUrlAction.execute(`
        <fetch_url>
          <url>example.com</url>
        </fetch_url>
      `);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Invalid URL format. Must be a valid URL with protocol (http:// or https://)");
    });

    it("should handle missing URL parameter", async () => {
      const result = await fetchUrlAction.execute(`
        <fetch_url>
        </fetch_url>
      `);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("No URL provided");
    });

    it("should handle fetch error", async () => {
      const mockError = new Error("Network error");
      (fetch_url as jest.Mock).mockRejectedValue(mockError);

      const result = await fetchUrlAction.execute(`
        <fetch_url>
          <url>http://example.com</url>
        </fetch_url>
      `);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Network error");
    });
  });
});