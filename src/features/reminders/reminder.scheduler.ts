import { Markup, Telegraf } from "telegraf";
import {
  findUsersDueFor24hReminder,
  findUsersDueFor40hReminder,
  markReminder24hSent,
  markReminder40hSent,
} from "../users/user.service";
import { colored } from "../../shared/colored-button";

const CHECK_INTERVAL_MS = 15 * 60 * 1000;

const reminder24hKeyboard = Markup.inlineKeyboard([
  [colored(Markup.button.callback("👉 Sinov darsiga yozilish", "trial_lesson"), "primary")],
]);

const reminder40hKeyboard = Markup.inlineKeyboard([
  [colored(Markup.button.callback("👉 Admin bilan bog'lanish", "contact_admin"), "primary")],
]);

function build24hMessage(fullName: string | null): string {
  const name = fullName ?? "Aziz mijoz";
  return (
    `⏳ ${name}, vaucheringiz muddati tugashiga 24 soat qoldi!\n\n` +
    "1 000 000 so'mlik chegirmangiz kuyib ketmasligi uchun bugun darsga yozilishni tasdiqlang."
  );
}

const REMINDER_40H_MESSAGE =
  "⚠️ Oxirgi 8 soat!\n\n" +
  "O'rningiz boshqa o'quvchiga o'tib ketishidan oldin o'z chegirmangizni band qiling.";

async function send24hReminders(bot: Telegraf): Promise<void> {
  const users = await findUsersDueFor24hReminder();

  for (const user of users) {
    try {
      await bot.telegram.sendMessage(user.telegramId, build24hMessage(user.fullName), reminder24hKeyboard);
    } catch (err) {
      console.warn(`Could not send 24h reminder to ${user.telegramId}:`, err);
    } finally {
      await markReminder24hSent(user.telegramId);
    }
  }
}

async function send40hReminders(bot: Telegraf): Promise<void> {
  const users = await findUsersDueFor40hReminder();

  for (const user of users) {
    try {
      await bot.telegram.sendMessage(user.telegramId, REMINDER_40H_MESSAGE, reminder40hKeyboard);
    } catch (err) {
      console.warn(`Could not send 40h reminder to ${user.telegramId}:`, err);
    } finally {
      await markReminder40hSent(user.telegramId);
    }
  }
}

async function runReminderCheck(bot: Telegraf): Promise<void> {
  try {
    await send24hReminders(bot);
    await send40hReminders(bot);
  } catch (err) {
    console.error("Reminder check failed:", err);
  }
}

export function startReminderScheduler(bot: Telegraf): void {
  runReminderCheck(bot);
  setInterval(() => runReminderCheck(bot), CHECK_INTERVAL_MS);
}
