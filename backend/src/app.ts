import express, { type Express } from "express";
import cors, { type CorsOptions } from "cors";

import authRoutes from "./routes/v1/auth.routes.js";
import healthRoutes from "./routes/v1/health.routes.js";
import modelRoutes from "./routes/v1/model.routes.js";
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
    "ngrok-skip-browser-warning",
    "Authorization",
  ],
  exposedHeaders: [
    "Content-Type",
    "ngrok-agent-ips",
  ],
  credentials: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

app.use((req, _res, next) => {
  console.info("[api] Request", {
    method: req.method,
    path: req.originalUrl,
    origin: req.header("origin"),
    accessControlRequestMethod: req.header("access-control-request-method"),
    accessControlRequestHeaders: req.header("access-control-request-headers"),
    contentType: req.header("content-type"),
    hasNgrokSkipHeader: Boolean(req.header("ngrok-skip-browser-warning")),
  });

  next();
});

app.use(express.json());

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/models", modelRoutes);
app.use("/api/v1/chat/stream", chatStreamRoutes);
app.use("/api/v1/chat", chatRoutes);

app.use(errorHandler);

export default app;
