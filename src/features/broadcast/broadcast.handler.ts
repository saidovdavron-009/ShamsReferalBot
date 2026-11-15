import { Markup, Telegraf } from "telegraf";
import { getAllUnregisteredUsers, getUserStats } from "../users/user.service";
import { isStatsViewer } from "../stats/stats.handler";
import { safeAnswerCbQuery } from "../../shared/safe-answer-cb-query";
import { colored } from "../../shared/colored-button";

const REMINDER_TEXT =
  "Assalomu alaykum! 👋\n\n" +
  "Siz hali ham bizning botimizdan ro'yxatdan o'tmagan ekansiz 😊\n\n" +
  "🎁 Hoziroq ro'yxatdan o'ting va kurslarimiz uchun <b>1 000 000 so'mlik chegirmaga</b> ega bo'ling!\n\n" +
  "Sizni o'quvchilarimiz safida ko'rishdan mamnun bo'lamiz 🤝\n\n" +
  "👇 Ro'yxatdan o'tish uchun pastdagi tugmani bosing";

const reminderKeyboard = Markup.inlineKeyboard([
  [colored(Markup.button.callback("Ro'yxatdan o'tish", "register_start"), "success")],
]);

// Telegram allows ~30 messages/second per bot, so send in parallel batches
// of 25 with a one-second pause between batches.
const BATCH_SIZE = 25;
const BATCH_DELAY_MS = 1000;

let broadcastInProgress = false;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runBroadcast(bot: Telegraf, adminChatId: number): Promise<void> {
  const users = await getAllUnregisteredUsers();
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((user) =>
        bot.telegram.sendMessage(user.telegramId, REMINDER_TEXT, {
          parse_mode: "HTML",
          ...reminderKeyboard,
        })
      )
    );

    results.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        sent++;
      } else {
        // Usually the user blocked the bot or deleted their account.
        failed++;
        console.warn(`Could not send unregistered reminder to ${batch[idx].telegramId}:`, result.reason);
      }
    });

    if (i + BATCH_SIZE < users.length) await delay(BATCH_DELAY_MS);
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
        `${REMINDER_TEXT}\n` +
        "———\n\n" +
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
