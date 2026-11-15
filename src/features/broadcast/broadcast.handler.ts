import { Markup, Telegraf } from "telegraf";
import { getAllUnregisteredUsers, getUserStats } from "../users/user.service";
import { isStatsViewer } from "../stats/stats.handler";
import { safeAnswerCbQuery } from "../../shared/safe-answer-cb-query";
import { colored } from "../../shared/colored-button";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildReminderText(name: string): string {
  return (
    `Assalomu alaykum, <b>${escapeHtml(name)}</b>! 👋\n\n` +
    "Siz hali ham bizning botimizdan ro'yxatdan o'tmagan ekansiz 😊\n\n" +
    "🎁 Hoziroq ro'yxatdan o'ting va kurslarimiz uchun <b>1 000 000 so'mlik chegirmaga</b> ega bo'ling!\n\n" +
    "Sizni o'quvchilarimiz safida ko'rishdan mamnun bo'lamiz 🤝\n\n" +
    "👇 Ro'yxatdan o'tish uchun pastdagi tugmani bosing"
  );
}

// Unregistered users usually have no fullName yet, so fall back to their
// Telegram first name, then to a generic greeting.
async function resolveName(bot: Telegraf, telegramId: string, fullName: string | null): Promise<string> {
  if (fullName) return fullName;
  try {
    const chat = await bot.telegram.getChat(telegramId);
    if ("first_name" in chat && chat.first_name) return chat.first_name;
  } catch {
    // ignore — sendMessage below will report the real failure
  }
  return "aziz foydalanuvchi";
}

const reminderKeyboard = Markup.inlineKeyboard([
  [colored(Markup.button.callback("Ro'yxatdan o'tish", "register_start"), "success")],
]);

// Telegram allows ~30 messages/second per bot; stay safely below it.
const SEND_DELAY_MS = 50;

let broadcastInProgress = false;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runBroadcast(bot: Telegraf, adminChatId: number): Promise<void> {
  const users = await getAllUnregisteredUsers();
  let sent = 0;
  let failed = 0;

  for (const user of users) {
    try {
      const name = await resolveName(bot, user.telegramId, user.fullName);
      await bot.telegram.sendMessage(user.telegramId, buildReminderText(name), {
        parse_mode: "HTML",
        ...reminderKeyboard,
      });
      sent++;
    } catch (err) {
      // Usually the user blocked the bot or deleted their account.
      failed++;
      console.warn(`Could not send unregistered reminder to ${user.telegramId}:`, err);
    }
    await delay(SEND_DELAY_MS);
  }

  await bot.telegram.sendMessage(
    adminChatId,
    "✅ Xabar yuborish yakunlandi\n\n" +
      `📨 Yetkazildi: ${sent} ta\n` +
      `🚫 Yetkazilmadi (botni bloklagan): ${failed} ta`
  );
}

export function registerBroadcastHandler(bot: Telegraf): void {
  bot.action("broadcast_unreg", async (ctx) => {
    if (!isStatsViewer(ctx.from.username)) {
      await safeAnswerCbQuery(ctx, "⛔ Sizda bu bo'limga ruxsat yo'q");
      return;
    }
    await safeAnswerCbQuery(ctx);

    const { total, registered } = await getUserStats();
    await ctx.reply(
      `📢 Ro'yxatdan o'tmagan <b>${total - registered} ta</b> foydalanuvchiga quyidagi xabar yuboriladi:\n\n` +
        "———\n" +
        `${buildReminderText("{ism}")}\n` +
        "———\n" +
        "<i>{ism} o'rniga har bir foydalanuvchining ismi qo'yiladi.</i>\n\n" +
        "Yuborilsinmi?",
      {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
          [
            colored(Markup.button.callback("✅ Ha, yuborish", "broadcast_unreg_confirm"), "success"),
            colored(Markup.button.callback("❌ Bekor qilish", "broadcast_unreg_cancel"), "danger"),
          ],
        ]),
      }
    );
  });

  bot.action("broadcast_unreg_cancel", async (ctx) => {
    await safeAnswerCbQuery(ctx);
    await ctx.editMessageText("❌ Xabar yuborish bekor qilindi.").catch(() => undefined);
  });

  bot.action("broadcast_unreg_confirm", async (ctx) => {
    if (!isStatsViewer(ctx.from.username)) {
      await safeAnswerCbQuery(ctx, "⛔ Sizda bu bo'limga ruxsat yo'q");
      return;
    }
    if (broadcastInProgress) {
      await safeAnswerCbQuery(ctx, "⏳ Xabarlar hozir yuborilmoqda, kuting");
      return;
    }
    await safeAnswerCbQuery(ctx);
    await ctx.editMessageText("⏳ Xabarlar yuborilmoqda... Tugagach natijani yuboraman.").catch(() => undefined);

    broadcastInProgress = true;
    const adminChatId = ctx.chat!.id;
    // Run in the background so the bot keeps answering other users meanwhile.
    void runBroadcast(bot, adminChatId)
      .catch((err) => console.error("Unregistered broadcast failed:", err))
      .finally(() => {
        broadcastInProgress = false;
      });
  });
}
