import { Telegraf } from "telegraf";
import { getReferrals, getUser } from "../users/user.service";
import { safeAnswerCbQuery } from "../../shared/safe-answer-cb-query";
import { replyRequireRegistration } from "../../shared/require-registration";

export function registerStatusHandler(bot: Telegraf): void {
  bot.action("status", async (ctx) => {
    const telegramId = String(ctx.from.id);
    const user = await getUser(telegramId);

    if (!user?.isRegistered) {
      await replyRequireRegistration(ctx);
      return;
    }

    await safeAnswerCbQuery(ctx);

    const referrals = await getReferrals(telegramId);

    if (referrals.length === 0) {
      await ctx.reply("📊 Status\n\nSiz orqali hali hech kim ro'yxatdan o'tmagan.");
      return;
    }

    const list = referrals
      .map((referral, index) => {
        const name = referral.isRegistered && referral.fullName
          ? referral.fullName
          : `@${referral.username ?? "noma'lum"} (ro'yxatdan o'tmagan)`;
        return `${index + 1}. ${name}`;
      })
      .join("\n");

    await ctx.reply(`📊 Status\n\nSiz orqali ro'yxatdan o'tganlar soni: ${referrals.length} ta\n\n${list}`);
  });
}
