import { Telegraf } from "telegraf";
import { getUser } from "../users/user.service";
import { generateCertificateBuffer } from "./certificate.service";
import { safeAnswerCbQuery } from "../../shared/safe-answer-cb-query";

export function registerCertificateHandler(bot: Telegraf): void {
  bot.action("get_certificate", async (ctx) => {
    const telegramId = String(ctx.from.id);
    const user = await getUser(telegramId);

    if (!user?.isRegistered || !user.fullName) {
      await safeAnswerCbQuery(ctx, "Avval ro'yxatdan o'ting!", { show_alert: true });
      return;
    }

    await safeAnswerCbQuery(ctx);

    const certificateBuffer = await generateCertificateBuffer(user.fullName);

    await ctx.replyWithPhoto(
      { source: certificateBuffer },
      { caption: "🏆 Tabriklaymiz! Mana sizning sertifikatingiz." }
    );
  });
}
