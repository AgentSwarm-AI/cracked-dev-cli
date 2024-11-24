import { FetchUrlAction } from "@services/LLM/actions/FetchUrlAction";
import axios from "axios";
import { container } from "tsyringe";

jest.mock("axios");

describe("FetchUrlAction", () => {
  let fetchUrlAction: FetchUrlAction;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchUrlAction = container.resolve(FetchUrlAction);
  });

  describe("execute", () => {
    it("should fetch URL successfully with valid parameters", async () => {
      const mockData = "Mock Data";
      (axios.get as jest.Mock).mockResolvedValue({ data: mockData });

      const result = await fetchUrlAction.execute(`
        <fetch_url>
          <url>http://example.com</url>
        </fetch_url>
      `);

      expect(result.success).toBe(true);
      expect(result.data).toBe(mockData);
      expect(axios.get).toHaveBeenCalledWith("http://example.com");
    });

    it("should handle invalid URL format", async () => {
      const result = await fetchUrlAction.execute(`
        <fetch_url>
          <url>example.com</url>
        </fetch_url>
      `);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(
        "Invalid URL format. Must be a valid URL with protocol (http:// or https://)",
      );
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
      (axios.get as jest.Mock).mockRejectedValue(mockError);

      const result = await fetchUrlAction.execute(`
        <fetch_url>
          <url>http://example.com</url>
        </fetch_url>
      `);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Error fetching URL: Network error");
    });
  });
});
