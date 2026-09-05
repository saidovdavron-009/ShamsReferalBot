import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env variable: ${name}`);
  }
  return value;
}

export const env = {
  botToken: required("BOT_TOKEN"),
  port: Number(process.env.PORT ?? 3003),
  databaseUrl: process.env.DATABASE_URL ?? null,
  dbSsl: process.env.DB_SSL === "true",
  adminUsername: process.env.ADMIN_USERNAME ?? "Shams_markaz_admin",
  selfUrl: process.env.SELF_URL ?? null,
  db: {
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USER ?? "postgres",
    password: process.env.DB_PASSWORD ?? "postgres",
    database: process.env.DB_NAME ?? "shams_referal_bot",
  },
};
