import express, { type Express } from "express";
import cors, { type CorsOptions } from "cors";

import authRoutes from "./routes/v1/auth.routes.js";
import healthRoutes from "./routes/v1/health.routes.js";
import modelRoutes from "./routes/v1/model.routes.js";
import usersRoutes from "./routes/v1/users.routes.js";
import rolesRoutes from "./routes/v1/roles.routes.js";
import permissionsRoutes from "./routes/v1/permissions.routes.js";
import chatRoutes from "./routes/v1/chat.routes.js";
import chatStreamRoutes from "./routes/v1/chat-stream.routes.js";
import projectsRoutes from "./routes/v1/projects.routes.js";
import contentRoutes from "./routes/v1/content.routes.js";
import imageRoutes from "./routes/v1/image.routes.js";
import promptTemplatesRoutes from "./routes/v1/prompt-templates.routes.js";
import savedPromptsRoutes from "./routes/v1/saved-prompts.routes.js";

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
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
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
app.use("/api/v1/roles", rolesRoutes);
app.use("/api/v1/permissions", permissionsRoutes);
app.use("/api/v1/chat/stream", chatStreamRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/projects", projectsRoutes);
app.use("/api/v1/content", contentRoutes);
app.use("/api/v1/images", imageRoutes);
app.use("/api/v1/prompt-templates", promptTemplatesRoutes);
app.use("/api/v1/saved-prompts", savedPromptsRoutes);

app.use(errorHandler);

export default app;
