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
import assetRoutes from "./routes/v1/asset.routes.js";
import promptTemplatesRoutes from "./routes/v1/prompt-templates.routes.js";
import savedPromptsRoutes from "./routes/v1/saved-prompts.routes.js";
import brandKitsRoutes from "./routes/v1/brand-kits.routes.js";
import videoAssetsRoutes from "./routes/v1/video-assets.routes.js";
import analyticsRoutes from "./routes/v1/analytics.routes.js";
import automationConnectionsRoutes from "./routes/v1/automation-connections.routes.js";
import automationMcpServersRoutes from "./routes/v1/automation-mcp-servers.routes.js";
import automationAuditLogsRoutes from "./routes/v1/automation-audit-logs.routes.js";

import { errorHandler } from "./middleware/error-handler.js";
import {
  registerImageProviders,
  validateImageProviderConfig,
} from "./providers/register-image-providers.js";
import { registerPlatformProviders } from "./providers/register-platform-providers.js";
import {
  registerMcpConnectors,
  validateMcpConnectorConfig,
} from "./providers/register-mcp-connectors.js";
import { validateLocalDiskStorageConfig } from "./providers/local-disk/local-disk-storage.provider.js";
import { validateGeminiProviderConfig } from "./providers/gemini/gemini-image.provider.js";
import {
  validateComfyUIProviderConfig,
  logComfyUIHealthCheck,
} from "./providers/comfyui/comfyui.provider.js";
import {
  validateHuggingFaceProviderConfig,
  logHuggingFaceHealthCheck,
} from "./providers/huggingface/huggingface.provider.js";
import { env } from "./config/env.js";

registerImageProviders();
validateImageProviderConfig();
validateLocalDiskStorageConfig();
registerPlatformProviders();
registerMcpConnectors();
validateMcpConnectorConfig();

// Provider-specific config checks run only when that provider is the
// configured default — an explicit per-request override still works
// without one (see validateGeminiProviderConfig()'s own comment).
const configuredImageProvider = env.imageProvider.trim().toLowerCase();

if (configuredImageProvider === "gemini") {
  validateGeminiProviderConfig();
}

if (configuredImageProvider === "comfyui") {
  validateComfyUIProviderConfig();
  logComfyUIHealthCheck();
}

if (configuredImageProvider === "huggingface") {
  validateHuggingFaceProviderConfig();
  logHuggingFaceHealthCheck();
}

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

// Serves generated images saved by LocalDiskStorageProvider. Sprint 4.1/4.2
// built and validated the full generate -> store -> persist pipeline
// backend-only, so nothing ever actually served env.storagePublicBaseUrl —
// discovered while wiring up Sprint 4.3's frontend slice, which is the
// first thing that actually needs to load a generated image over HTTP.
// Filenames are server-generated UUIDs (see LocalDiskStorageProvider.save()),
// not sequential or guessable, so unauthenticated static serving — the same
// trust model countless similar apps use for object storage — is
// appropriate here without adding an authenticated file-streaming route.
app.use(env.storagePublicBaseUrl, express.static(env.storageLocalRoot));

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
app.use("/api/v1/assets", assetRoutes);
app.use("/api/v1/prompt-templates", promptTemplatesRoutes);
app.use("/api/v1/saved-prompts", savedPromptsRoutes);
app.use("/api/v1/brand-kits", brandKitsRoutes);
app.use("/api/v1/video-assets", videoAssetsRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/automation/connections", automationConnectionsRoutes);
app.use("/api/v1/automation/mcp-servers", automationMcpServersRoutes);
app.use("/api/v1/automation/audit-logs", automationAuditLogsRoutes);

app.use(errorHandler);

export default app;
