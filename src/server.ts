import "reflect-metadata";
import { AppDataSource } from "./config/data-source";
import { createApp } from "./app";
import { createBot } from "./bot/bot";
import { env } from "./config/env";

async function bootstrap(): Promise<void> {
  await AppDataSource.initialize();
  console.log("Database connected");

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`Express server running on port ${env.port}`);
  });

  const bot = createBot();
  bot.launch({ dropPendingUpdates: true }).catch((err) => {
    console.error("Failed to launch bot:", err);
    process.exit(1);
  });
  console.log("Telegram bot started (long polling)");

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

bootstrap().catch((err) => {
  console.error("Failed to start application:", err);
  process.exit(1);
});
