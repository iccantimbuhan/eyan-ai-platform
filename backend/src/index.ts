import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";

app.listen(env.port, () => {
  logger.info("================================================");
  logger.info("🚀 EYAN AI Platform Backend");
  logger.info("================================================");
  logger.info(`Environment : ${process.env.NODE_ENV ?? "development"}`);
  logger.info(`Port        : ${env.port}`);
  logger.info(`API         : http://localhost:${env.port}/api/v1`);
  logger.info(`Health      : http://localhost:${env.port}/api/v1/health`);
  logger.info("================================================");
  logger.info("✅ Server Ready");
});
