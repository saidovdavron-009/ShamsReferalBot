import { Telegraf } from "telegraf";
import { env } from "../../config/env";
import { getUserStats } from "../users/user.service";
import { safeAnswerCbQuery } from "../../shared/safe-answer-cb-query";

export function isStatsViewer(username: string | null | undefined): boolean {
  return !!username && env.statsViewerUsernames.includes(username.toLowerCase());
}

export function registerStatsHandler(bot: Telegraf): void {
  bot.action("view_users", async (ctx) => {
    if (!isStatsViewer(ctx.from.username)) {
      await safeAnswerCbQuery(ctx, "⛔ Sizda bu bo'limga ruxsat yo'q");
      return;
    }

    await safeAnswerCbQuery(ctx);

    const { total, registered } = await getUserStats();

    await ctx.reply(
      "👥 Foydalanuvchilar hisoboti\n\n" +
      `Botdagi jami foydalanuvchilar: ${total} ta\n` +
      `✅ Ro'yxatdan o'tganlar: ${registered} ta\n` +
      `⏳ Ro'yxatdan o'tmaganlar: ${total - registered} ta`
    );
  });
}
