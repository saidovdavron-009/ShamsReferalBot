import { Markup, Telegraf } from "telegraf";
import { countReferrals, getUser } from "../users/user.service";
import { safeAnswerCbQuery } from "../../shared/safe-answer-cb-query";
import { replyRequireRegistration } from "../../shared/require-registration";
import { getReferralLink } from "../../shared/referral-link";
import registeredMenuKeyboard from "../start/start.keyboard";
import { colored } from "../../shared/colored-button";

function buildReferralMessage(referralLink: string, invitedCount: number): string {
  return (
    "🚀 Do'stingizni taklif qiling va qo'shimcha 20% chegirmaga ega bo'ling!\n\n" +
    "Qoidalar oddiy:\n" +
    "• Quyidagi maxsus havolangizni do'stlaringizga yoki guruhlarga yuboring.\n" +
    "• Do'stingiz havola orqali botga kirib kursga yozilsa, sizga avtomatik tarzda +20% qo'shimcha chegirma beriladi.\n" +
    "• Do'stingiz ham o'zining 1 000 000 so'mlik vaucheriga ega bo'ladi.\n\n" +
    `🔗 Sizning shaxsiy taklif havolangiz:\n${referralLink}\n\n` +
    `📊 Sizning takliflaringiz: ${invitedCount} ta do'st`
  );
}

function buildReferralKeyboard(referralLink: string) {
  const shareText = "Shams o'quv markazida 1 000 000 so'mlik vaucherni qo'lga kiriting! 🎁";
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`;

  return Markup.inlineKeyboard([
    [colored(Markup.button.url("📲 Do'stlarga ulashish", shareUrl), "success")],
    [colored(Markup.button.callback("🔄 Statistikani yangilash", "refresh_referral_stats"), "primary")],
    [colored(Markup.button.callback("🔙 Orqaga", "back_to_menu"), "primary")],
  ]);
}

export function registerReferralHandler(bot: Telegraf): void {
  bot.action("invite_friend", async (ctx) => {
    const telegramId = String(ctx.from.id);
    const user = await getUser(telegramId);

    if (!user?.isRegistered) {
      await replyRequireRegistration(ctx);
      return;
    }

    const referralLink = await getReferralLink(ctx, telegramId);
    const invitedCount = await countReferrals(telegramId);

    await safeAnswerCbQuery(ctx);
    await ctx.reply(buildReferralMessage(referralLink, invitedCount), buildReferralKeyboard(referralLink));
  });

  bot.action("refresh_referral_stats", async (ctx) => {
    const telegramId = String(ctx.from.id);
    const user = await getUser(telegramId);

    if (!user?.isRegistered) {
      await replyRequireRegistration(ctx);
      return;
    }

    const referralLink = await getReferralLink(ctx, telegramId);
    const invitedCount = await countReferrals(telegramId);

    try {
      await ctx.editMessageText(buildReferralMessage(referralLink, invitedCount), buildReferralKeyboard(referralLink));
      await safeAnswerCbQuery(ctx, "✅ Yangilandi");
    } catch (err) {
      await safeAnswerCbQuery(ctx, "✅ Statistikangiz o'zgarmagan");
    }
  });

  bot.action("back_to_menu", async (ctx) => {
    await safeAnswerCbQuery(ctx);

    try {
      await ctx.editMessageText("🏠 Asosiy menyu", registeredMenuKeyboard);
    } catch (err) {
      await ctx.reply("🏠 Asosiy menyu", registeredMenuKeyboard);
    }
  });
}
