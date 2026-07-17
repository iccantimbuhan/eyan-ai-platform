import express from "express";
import cors from "cors";

import healthRoutes from "./routes/v1/health.routes.js";
import modelRoutes from "./routes/v1/model.routes.js";
import chatRoutes from "./routes/v1/chat.routes.js";
import chatStreamRoutes from "./routes/v1/chat-stream.routes.js";

import { errorHandler } from "./middleware/error-handler.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/models", modelRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/chat/stream", chatStreamRoutes);

app.use(errorHandler);

export default app;