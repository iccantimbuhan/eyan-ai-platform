import express, { type Express } from "express";
import cors, { type CorsOptions } from "cors";

import authRoutes from "./routes/v1/auth.routes.js";
import healthRoutes from "./routes/v1/health.routes.js";
import modelRoutes from "./routes/v1/model.routes.js";
import usersRoutes from "./routes/v1/users.routes.js";
import rolesRoutes from "./routes/v1/roles.routes.js";
import permissionsRoutes from "./routes/v1/permissions.routes.js";
import organizationsRoutes from "./routes/v1/organizations.routes.js";
import organizationRestaurantsRoutes from "./routes/v1/organization-restaurants.routes.js";
import restaurantsRoutes from "./routes/v1/restaurants.routes.js";
import branchesRoutes from "./routes/v1/branches.routes.js";
import menuCategoriesRoutes from "./routes/v1/menu-categories.routes.js";
import menuItemsRoutes from "./routes/v1/menu-items.routes.js";
import organizationStaffRoutes from "./routes/v1/organization-staff.routes.js";
import restaurantStaffRoutes from "./routes/v1/restaurant-staff.routes.js";
import unitsRoutes from "./routes/v1/units.routes.js";
import ingredientCategoriesRoutes from "./routes/v1/ingredient-categories.routes.js";
import suppliersRoutes from "./routes/v1/suppliers.routes.js";
import ingredientsRoutes from "./routes/v1/ingredients.routes.js";
import recipesRoutes from "./routes/v1/recipes.routes.js";
import recipeIngredientsRoutes from "./routes/v1/recipe-ingredients.routes.js";
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
import videoSourcesRoutes from "./routes/v1/video-sources.routes.js";
import videoWorkflowPlannerRoutes from "./routes/v1/video-workflow-planner.routes.js";
import videoExecutionRoutes from "./routes/v1/video-execution.routes.js";
import analyticsRoutes from "./routes/v1/analytics.routes.js";
import automationConnectionsRoutes from "./routes/v1/automation-connections.routes.js";
import automationMcpServersRoutes from "./routes/v1/automation-mcp-servers.routes.js";
import automationAuditLogsRoutes from "./routes/v1/automation-audit-logs.routes.js";
import financeDashboardRoutes from "./routes/v1/finance-dashboard.routes.js";
import financeExpensesRoutes from "./routes/v1/finance-expenses.routes.js";
import financeBudgetRoutes from "./routes/v1/finance-budget.routes.js";
import financeServiceRoutes from "./routes/v1/finance-service.routes.js";
import crmLeadsRoutes from "./routes/v1/crm-leads.routes.js";
import crmServiceRoutes from "./routes/v1/crm-service.routes.js";
import aiCoreCapabilitiesRoutes from "./routes/v1/ai-core-capabilities.routes.js";
import aiCoreServiceRoutes from "./routes/v1/ai-core-service.routes.js";
import aiCoreBrainsRoutes from "./routes/v1/ai-core-brains.routes.js";
import aiCoreProvidersRoutes from "./routes/v1/ai-core-providers.routes.js";
import aiCoreModelsRoutes from "./routes/v1/ai-core-models.routes.js";
import aiCorePlaygroundRoutes from "./routes/v1/ai-core-playground.routes.js";
import aiCoreUsageRoutes from "./routes/v1/ai-core-usage.routes.js";
import aiCoreHealthRoutes from "./routes/v1/ai-core-health.routes.js";
import aiCoreAuditLogsRoutes from "./routes/v1/ai-core-audit-logs.routes.js";

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
import {
  registerAiCoreProviders,
  validateAiCoreProviderConfig,
} from "./providers/register-ai-core-providers.js";
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
registerAiCoreProviders();
validateAiCoreProviderConfig();

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

// Sprint 5.2 — production runs behind nginx (eyan.fyi/automation.eyan.fyi),
// which sets X-Forwarded-For on every request. Without this, express-rate-
// limit logs ERR_ERL_UNEXPECTED_X_FORWARDED_FOR and can't reliably key rate
// limits by real client IP. `1` trusts exactly one hop (nginx on this same
// box), not an arbitrary proxy chain. Confirmed via investigation not to be
// the cause of the Sprint 5.2 pipeline failure — fixed alongside it since
// it's a real, if separate, correctness gap.
app.set("trust proxy", 1);

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
app.use("/api/v1/organizations", organizationsRoutes);
app.use("/api/v1/organizations/:organizationId/restaurants", organizationRestaurantsRoutes);
app.use("/api/v1/organizations/:organizationId/staff", organizationStaffRoutes);
app.use("/api/v1/restaurants/:restaurantId/staff", restaurantStaffRoutes);
app.use("/api/v1/restaurants", restaurantsRoutes);
app.use("/api/v1/branches", branchesRoutes);
app.use("/api/v1/menu-categories", menuCategoriesRoutes);
app.use("/api/v1/menu-items", menuItemsRoutes);
app.use("/api/v1/units", unitsRoutes);
app.use("/api/v1/ingredient-categories", ingredientCategoriesRoutes);
app.use("/api/v1/suppliers", suppliersRoutes);
app.use("/api/v1/ingredients", ingredientsRoutes);
app.use("/api/v1/recipes", recipesRoutes);
app.use("/api/v1/recipe-ingredients", recipeIngredientsRoutes);
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
app.use("/api/v1/video-edit/sources", videoSourcesRoutes);
app.use("/api/v1/video-edit/planner", videoWorkflowPlannerRoutes);
app.use("/api/v1/video-edit/execute", videoExecutionRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/automation/connections", automationConnectionsRoutes);
app.use("/api/v1/automation/mcp-servers", automationMcpServersRoutes);
app.use("/api/v1/automation/audit-logs", automationAuditLogsRoutes);
app.use("/api/v1/finance/dashboard", financeDashboardRoutes);
app.use("/api/v1/finance/expenses", financeExpensesRoutes);
app.use("/api/v1/finance/budget", financeBudgetRoutes);
app.use("/api/v1/finance/service", financeServiceRoutes);
app.use("/api/v1/crm/leads", crmLeadsRoutes);
app.use("/api/v1/crm/service", crmServiceRoutes);
app.use("/api/v1/ai-core/capabilities", aiCoreCapabilitiesRoutes);
app.use("/api/v1/ai-core/service/capabilities", aiCoreServiceRoutes);
app.use("/api/v1/ai-core/brains", aiCoreBrainsRoutes);
app.use("/api/v1/ai-core/providers", aiCoreProvidersRoutes);
app.use("/api/v1/ai-core/models", aiCoreModelsRoutes);
app.use("/api/v1/ai-core/playground", aiCorePlaygroundRoutes);
app.use("/api/v1/ai-core", aiCoreUsageRoutes);
app.use("/api/v1/ai-core/health", aiCoreHealthRoutes);
app.use("/api/v1/ai-core/audit-logs", aiCoreAuditLogsRoutes);

app.use(errorHandler);

export default app;
