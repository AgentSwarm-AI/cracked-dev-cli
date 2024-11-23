import { fetch_url } from "@services/FileManagement/FetchUtil";
import axios from "axios";

jest.mock("axios");

describe("fetch_url", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch data successfully", async () => {
    const mockData = { data: "response data" };
    (axios.get as jest.Mock).mockResolvedValueOnce(mockData);

    const response = await fetch_url("https://example.com");

    expect(response).toEqual(mockData.data);
    expect(axios.get).toHaveBeenCalledWith("https://example.com");
  });

  it("should handle fetch errors", async () => {
    const error = new Error("Fetch error");
    (axios.get as jest.Mock).mockRejectedValueOnce(error);

    await expect(fetch_url("https://example.com")).rejects.toThrow(
      "Fetch error",
    );
    expect(axios.get).toHaveBeenCalledWith("https://example.com");
  });
});
