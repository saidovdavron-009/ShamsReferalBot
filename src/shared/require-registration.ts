import { Context, Markup } from "telegraf";
import { safeAnswerCbQuery } from "./safe-answer-cb-query";
import { colored } from "./colored-button";

export async function replyRequireRegistration(ctx: Context): Promise<void> {
  await safeAnswerCbQuery(ctx);
  await ctx.reply(
    "🙏 Bu imkoniyatdan foydalanish uchun avval ro'yxatdan o'ting!\n\n" +
      "📝 Ism va familiyangizni yuborish uchun pastdagi tugmani bosing.",
    Markup.inlineKeyboard([[colored(Markup.button.callback("📝 Ro'yxatdan o'tish", "register_start"), "success")]])
  );
}
