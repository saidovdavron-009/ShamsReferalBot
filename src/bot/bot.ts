import { Telegraf } from "telegraf";
import { env } from "../config/env";
import { registerStartHandler } from "../features/start/start.handler";
import { registerRegisterHandler } from "../features/register/register.handler";
import { registerReferralHandler } from "../features/referral/referral.handler";

export function createBot(): Telegraf {
  const bot = new Telegraf(env.botToken);

  registerStartHandler(bot);
  registerReferralHandler(bot);
  registerRegisterHandler(bot);

  bot.catch((err) => {
    console.error("Bot error:", err);
  });

  return bot;
}
