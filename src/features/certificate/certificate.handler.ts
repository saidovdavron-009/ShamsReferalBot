import { Telegraf } from "telegraf";
import { getOrIssueVoucher, getUser } from "../users/user.service";
import { generateCertificateBuffer } from "./certificate.service";
import { safeAnswerCbQuery } from "../../shared/safe-answer-cb-query";
import { replyRequireRegistration } from "../../shared/require-registration";
import { getReferralLink } from "../../shared/referral-link";
import { getActiveGroup } from "../groups/group.service";
import { withRetry } from "../../shared/with-retry";

export function registerCertificateHandler(bot: Telegraf): void {
  bot.action("get_certificate", async (ctx) => {
    const telegramId = String(ctx.from.id);
    const user = await getUser(telegramId);

    if (!user?.isRegistered || !user.fullName) {
      await replyRequireRegistration(ctx);
      return;
    }

    const group = await getActiveGroup();

    if (!group) {
      await safeAnswerCbQuery(ctx, "Bot hali hech qanday guruhga qo'shilmagan!", { show_alert: true });
      return;
    }

    await safeAnswerCbQuery(ctx);

    const { issuedAt } = await getOrIssueVoucher(telegramId);
    const referralLink = await getReferralLink(ctx, telegramId);
    const certificateBuffer = await generateCertificateBuffer(user.fullName, telegramId, referralLink, issuedAt);

    try {
      await withRetry(() =>
        ctx.telegram.sendPhoto(
          group.chatId,
          { source: certificateBuffer },
          { caption: `🏆 Tabriklaymiz, ${user.fullName}! Mana sizning sertifikatingiz.` }
        )
      );
      await ctx.reply("✅ Sertifikatingiz guruhga yuborildi!");
    } catch (err) {
      console.warn(`Could not send certificate to group ${group.chatId}:`, err);
      await ctx.reply("🙏 Kechirasiz, sertifikatni guruhga yuborib bo'lmadi. Keyinroq urinib ko'ring.");
    }
  });
}
