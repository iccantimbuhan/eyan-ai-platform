import axios from "axios";

console.log("VITE_API_URL =", import.meta.env.VITE_API_URL);

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  console.log("===== AXIOS REQUEST =====");
  console.log("Base URL:", config.baseURL);
  console.log("URL:", config.url);
  console.log(config);
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log("===== AXIOS RESPONSE =====");
    console.log(response);
    return response;
  },
  (error) => {
    console.log("===== AXIOS ERROR =====");
    console.log(error);
    console.log("Response:", error.response);
    console.log("Request:", error.request);
    throw error;
  }
);