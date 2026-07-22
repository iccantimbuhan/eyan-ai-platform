import express, { type Express } from "express";
import cors, { type CorsOptions } from "cors";

import authRoutes from "./routes/v1/auth.routes.js";
import healthRoutes from "./routes/v1/health.routes.js";
import modelRoutes from "./routes/v1/model.routes.js";
import usersRoutes from "./routes/v1/users.routes.js";
import chatRoutes from "./routes/v1/chat.routes.js";
import chatStreamRoutes from "./routes/v1/chat-stream.routes.js";

import { errorHandler } from "./middleware/error-handler.js";

const app: Express = express();

const allowedOrigins = new Set([
  "https://www.eyan.fyi",
  "https://eyan.fyi",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: [
    "Accept",
    "Content-Type",
    "Authorization",
    "ngrok-skip-browser-warning",
  ],
};

app.use(cors(corsOptions));

app.use(express.json());

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/models", modelRoutes);
app.use("/api/v1/users", usersRoutes);
app.use("/api/v1/chat/stream", chatStreamRoutes);
app.use("/api/v1/chat", chatRoutes);

app.use(errorHandler);

export default app;
