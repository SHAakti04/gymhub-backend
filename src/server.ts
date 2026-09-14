import { app } from "./app.js";
import { env } from "./config/env.js";
import { assertDbConnection } from "./config/db.js";
import { logger } from "./config/logger.js";
import { startScheduler } from "./jobs/scheduler.js";

async function bootstrap() {
  await assertDbConnection();
  if (env.ENABLE_JOBS) {
    startScheduler();
  }

  app.listen(env.PORT, () => {
    logger.info(`Backend listening on ${env.APP_BASE_URL}${env.API_PREFIX}`);
  });
}

bootstrap().catch((error) => {
  logger.error({ error }, "Failed to bootstrap backend");
  process.exit(1);
});