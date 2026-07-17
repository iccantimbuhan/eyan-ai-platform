import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

api.interceptors.request.use((config) => {
  console.log("===== AXIOS REQUEST =====");
  console.log("Base URL:", config.baseURL);
  console.log("URL:", config.url);

  // Make sure every request includes the ngrok bypass header
  config.headers["ngrok-skip-browser-warning"] = "true";

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
    return Promise.reject(error);
  }
);