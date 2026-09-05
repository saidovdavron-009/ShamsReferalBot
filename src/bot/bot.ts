import { Telegraf } from "telegraf";
import { env } from "../config/env";
import { registerStartHandler } from "../features/start/start.handler";
import { registerRegisterHandler } from "../features/register/register.handler";
import { registerReferralHandler } from "../features/referral/referral.handler";
import { registerCertificateHandler } from "../features/certificate/certificate.handler";
import { registerStatusHandler } from "../features/status/status.handler";
import { registerGroupHandler } from "../features/groups/group.handler";
import { startReminderScheduler } from "../features/reminders/reminder.scheduler";

export function createBot(): Telegraf {
  const bot = new Telegraf(env.botToken);

  registerStartHandler(bot);
  registerReferralHandler(bot);
  registerRegisterHandler(bot);
  registerCertificateHandler(bot);
  registerStatusHandler(bot);
  registerGroupHandler(bot);

  startReminderScheduler(bot);

  bot.catch((err) => {
    console.error("Bot error:", err);
  });

  return bot;
}
