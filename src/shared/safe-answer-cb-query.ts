import { Context } from "telegraf";

export async function safeAnswerCbQuery(
  ctx: Context,
  text?: string,
  extra?: { show_alert?: boolean }
): Promise<void> {
  try {
    await ctx.answerCbQuery(text, extra);
  } catch (err) {
    console.warn("answerCbQuery skipped (callback query likely expired):", err);
  }
}
