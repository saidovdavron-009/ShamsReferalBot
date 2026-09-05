import { Telegraf } from "telegraf";
import { getReferrals, getUser } from "../users/user.service";
import { safeAnswerCbQuery } from "../../shared/safe-answer-cb-query";
import { replyRequireRegistration } from "../../shared/require-registration";

const STATUS_ICON_EMOJI_ID = "5431577498364158238";
const STATUS_HEADING = "📊 Status";
const STATUS_HEADING_ENTITIES = [
  { type: "custom_emoji" as const, offset: 0, length: "📊".length, custom_emoji_id: STATUS_ICON_EMOJI_ID },
];

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
      await ctx.reply(`${STATUS_HEADING}\n\nSiz orqali hali hech kim ro'yxatdan o'tmagan.`, { entities: STATUS_HEADING_ENTITIES });
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

    await ctx.reply(`${STATUS_HEADING}\n\nSiz orqali ro'yxatdan o'tganlar soni: ${referrals.length} ta\n\n${list}`, { entities: STATUS_HEADING_ENTITIES });
  });
}
