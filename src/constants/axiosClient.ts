import axios, { AxiosInstance } from "axios";

export const createAxiosClient = (baseURL: string): AxiosInstance => {
  return axios.create({
    baseURL,
    timeout: 10000,
    headers: { "Content-Type": "application/json" },
  });
};

export const exampleApiClient = createAxiosClient("https://api.example.com"); // Replace with your API base URL
