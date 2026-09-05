import { Context, Markup } from "telegraf";
import { safeAnswerCbQuery } from "./safe-answer-cb-query";
import { colored } from "./colored-button";

// Custom emoji rendered in place of the glyphs below; the underlying
// characters are kept only as required placeholders for the entity offsets.
const PRAY_ICON_EMOJI_ID = "5249505880407303878";
const PRAY_PLACEHOLDER = "🙏";
const MEMO_ICON_EMOJI_ID = "6003704607191077227";
const MEMO_PLACEHOLDER = "📝";
const REGISTER_BUTTON_ICON_EMOJI_ID = "5197269100878907942";

export async function replyRequireRegistration(ctx: Context): Promise<void> {
  await safeAnswerCbQuery(ctx);

  const message =
    `${PRAY_PLACEHOLDER} Bu imkoniyatdan foydalanish uchun avval ro'yxatdan o'ting!\n\n` +
    `${MEMO_PLACEHOLDER} Ism va familiyangizni yuborish uchun pastdagi tugmani bosing.`;

  const prayOffset = message.indexOf(PRAY_PLACEHOLDER);
  const memoOffset = message.indexOf(MEMO_PLACEHOLDER);
  const entities = [
    prayOffset >= 0
      ? { type: "custom_emoji" as const, offset: prayOffset, length: PRAY_PLACEHOLDER.length, custom_emoji_id: PRAY_ICON_EMOJI_ID }
      : null,
    memoOffset >= 0
      ? { type: "custom_emoji" as const, offset: memoOffset, length: MEMO_PLACEHOLDER.length, custom_emoji_id: MEMO_ICON_EMOJI_ID }
      : null,
  ].filter((entity): entity is NonNullable<typeof entity> => entity !== null);

  await ctx.reply(message, {
    ...Markup.inlineKeyboard([[colored(Markup.button.callback("Ro'yxatdan o'tish", "register_start"), "success", REGISTER_BUTTON_ICON_EMOJI_ID)]]),
    entities,
  });
}
