import axios from "axios";
import { fetch_url } from "../../FetchUtil";

jest.mock("axios");

describe("fetch_url", () => {
  it("should fetch data successfully", async () => {
    const mockData = { data: "response data" };
    (axios.get as jest.Mock).mockResolvedValueOnce(mockData);

    const response = await fetch_url("https://example.com");

    expect(response).toEqual(mockData.data);
    expect(axios.get).toHaveBeenCalledWith("https://example.com");
  });

  it("should handle fetch errors", async () => {
    (axios.get as jest.Mock).mockRejectedValueOnce(new Error("Fetch error"));

    await expect(fetch_url("https://example.com")).rejects.toThrow(
      "Fetch error",
    );
  });
});
