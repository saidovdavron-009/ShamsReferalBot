import { Telegraf } from "telegraf";
import { completeRegistration, getUser, setAwaitingRegistration } from "../users/user.service";
import { isValidFullName } from "./full-name.validator";
import registeredMenuKeyboard from "../start/start.keyboard";
import { safeAnswerCbQuery } from "../../shared/safe-answer-cb-query";
import { notifyReferrerOfNewRegistration } from "../referral/referral.service";

export function registerRegisterHandler(bot: Telegraf): void {
  bot.action("register_start", async (ctx) => {
    const telegramId = String(ctx.from.id);
    const user = await getUser(telegramId);

    await safeAnswerCbQuery(ctx);

    if (user?.isRegistered) {
      await ctx.reply(`Siz allaqachon ro'yxatdan o'tgansiz, ${user.fullName}! ✅`);
      return;
    }

    await setAwaitingRegistration(telegramId, true);
    await ctx.reply("Iltimos, ismingiz va familiyangizni yozib yuboring (masalan: Saidov Davron):");
  });

  bot.action("edit_name", async (ctx) => {
    const telegramId = String(ctx.from.id);

    await safeAnswerCbQuery(ctx);
    await setAwaitingRegistration(telegramId, true);
    await ctx.reply("Ismingiz va familiyangizni kiriting:");
  });

  bot.on("text", async (ctx, next) => {
    const telegramId = String(ctx.from.id);
    const user = await getUser(telegramId);

    if (!user?.awaitingRegistration) {
      return next();
    }

    const fullName = ctx.message.text.trim();

    if (!isValidFullName(fullName)) {
      await ctx.reply(
        "🙏 Kechirasiz, kiritilgan ma'lumot to'g'ri ko'rinmayapti.\n\n" +
          "Iltimos, ism va familiyangizni faqat harflardan foydalanib, bo'sh joy bilan ajratib qayta yozing.\n\n" +
          "Masalan: Saidov Davron ✍️"
      );
      return;
    }

    const wasAlreadyRegistered = user.isRegistered;
    await completeRegistration(telegramId, fullName);

    if (wasAlreadyRegistered) {
      await ctx.reply(`✅ Ma'lumotlaringiz yangilandi. Endi siz ${fullName} deb qayd etildingiz.`, registeredMenuKeyboard);
      return;
    }

    await ctx.reply(`Xush kelibsiz, ${fullName}! Siz muvaffaqiyatli ro'yxatdan o'tdingiz. 🎉`, registeredMenuKeyboard);
    await notifyReferrerOfNewRegistration(ctx.telegram, user);
  });
}
