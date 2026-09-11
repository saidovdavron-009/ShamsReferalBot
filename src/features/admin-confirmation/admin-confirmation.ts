import { Markup, Telegraf } from "telegraf";
import {
  findUsersDueForEnrollmentConfirmation,
  getUser,
  getUserByUsername,
  markEnrollmentConfirmationSent,
  setCourseEnrolled,
} from "../users/user.service";
import { env } from "../../config/env";
import { safeAnswerCbQuery } from "../../shared/safe-answer-cb-query";
import { colored } from "../../shared/colored-button";

// First ping fires 3 minutes after the user presses "contact admin"; if the
// admin still hasn't answered Ha/Yo'q, it keeps repeating every 30 minutes
// until they do (see findUsersDueForEnrollmentConfirmation).
const CHECK_INTERVAL_MS = 60 * 1000;

const ENROLLED_MESSAGE = "🎉 Tabriklaymiz! Siz kursga muvaffaqiyatli yozildingiz!";
const NOT_ENROLLED_MESSAGE = "❌ Kursga yozilmaganingiz sababli vaucheringiz bekor qilindi.";

// Custom emoji rendered in place of the leading glyph of the message below;
// the underlying character is kept only as the required placeholder for the
// entity offset.
function leadingEmojiEntity(text: string, placeholder: string, customEmojiId: string) {
  const offset = text.indexOf(placeholder);
  return offset >= 0
    ? [{ type: "custom_emoji" as const, offset, length: placeholder.length, custom_emoji_id: customEmojiId }]
    : [];
}

const ENROLLED_CONFIRMED_CHECK_EMOJI_ID = "6107110905529504864";
const ENROLLED_PARTY_EMOJI_ID = "5404736937766430301";
const ENROLLED_MESSAGE_ENTITIES = leadingEmojiEntity(ENROLLED_MESSAGE, "🎉", ENROLLED_PARTY_EMOJI_ID);

function buildConfirmationKeyboard(telegramId: string) {
  return Markup.inlineKeyboard([
    [colored(Markup.button.callback("Ha", `admin_enroll_confirm:yes:${telegramId}`), "success")],
  ]);
}

async function runEnrollmentConfirmationCheck(bot: Telegraf): Promise<void> {
  if (!env.enrollmentConfirmUsername) {
    return;
  }

  try {
    const admin = await getUserByUsername(env.enrollmentConfirmUsername);
    if (!admin) {
      return;
    }

    const users = await findUsersDueForEnrollmentConfirmation();

    for (const user of users) {
      const name = user.fullName ?? `ID: ${user.telegramId}`;

      try {
        await bot.telegram.sendMessage(
          admin.telegramId,
          `❓ ${name} kursga yozilganini tasdiqlaysizmi?`,
          buildConfirmationKeyboard(user.telegramId)
        );
      } catch (err) {
        console.warn(`Could not send enrollment confirmation request for ${user.telegramId}:`, err);
      } finally {
        await markEnrollmentConfirmationSent(user.telegramId);
      }
    }
  } catch (err) {
    console.error("Enrollment confirmation check failed:", err);
  }
}

export function startEnrollmentConfirmationScheduler(bot: Telegraf): void {
  runEnrollmentConfirmationCheck(bot);
  setInterval(() => runEnrollmentConfirmationCheck(bot), CHECK_INTERVAL_MS);
}

export function registerAdminConfirmationHandler(bot: Telegraf): void {
  bot.action(/^admin_enroll_confirm:(yes|no):(\d+)$/, async (ctx) => {
    const enrolled = ctx.match[1] === "yes";
    const telegramId = ctx.match[2];

    await setCourseEnrolled(telegramId, enrolled);

    const user = await getUser(telegramId);
    const name = user?.fullName ?? `ID: ${telegramId}`;

    try {
      if (enrolled) {
        await ctx.telegram.sendMessage(telegramId, ENROLLED_MESSAGE, { entities: ENROLLED_MESSAGE_ENTITIES });
      } else {
        await ctx.telegram.sendMessage(telegramId, NOT_ENROLLED_MESSAGE);
      }
    } catch (err) {
      console.warn(`Could not notify user ${telegramId} of enrollment decision:`, err);
    }

    await safeAnswerCbQuery(ctx, enrolled ? "✅ Tasdiqlandi" : "❌ Belgilandi");

    if (enrolled) {
      const text = `✅ ${name} — kursga yozilgani tasdiqlandi.`;
      await ctx.editMessageText(text, {
        entities: leadingEmojiEntity(text, "✅", ENROLLED_CONFIRMED_CHECK_EMOJI_ID),
      });
    } else {
      await ctx.editMessageText(`❌ ${name} — kursga yozilmagan deb belgilandi.`);
    }
  });
}
