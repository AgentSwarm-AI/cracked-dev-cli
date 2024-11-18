import axios, { AxiosResponse } from "axios";

export const fetch_url = async <T = any>(url: string): Promise<T> => {
  try {
    const response: AxiosResponse<T> = await axios.get(url);
    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Network error: ${error.message}`);
    }
    throw new Error(`Error fetching URL: ${error.message}`);
  }
};
