import { Telegraf } from "telegraf";
import { countReferrals, getUser } from "../users/user.service";
import { safeAnswerCbQuery } from "../../shared/safe-answer-cb-query";

export function registerReferralHandler(bot: Telegraf): void {
  bot.action("invite_friend", async (ctx) => {
    const telegramId = String(ctx.from.id);
    const user = await getUser(telegramId);

    if (!user?.isRegistered) {
      await safeAnswerCbQuery(ctx, "Avval ro'yxatdan o'ting!", { show_alert: true });
      return;
    }

    const botUsername = ctx.botInfo?.username ?? (await ctx.telegram.getMe()).username;
    const referralLink = `https://t.me/${botUsername}?start=${telegramId}`;
    const invitedCount = await countReferrals(telegramId);

    await safeAnswerCbQuery(ctx);
    await ctx.reply(
      `🤝 Do'stlaringizni taklif qiling!\n\n` +
        `Quyidagi havolani ular bilan ulashing:\n${referralLink}\n\n` +
        `Siz orqali ro'yxatdan o'tganlar: ${invitedCount} ta`
    );
  });
}
