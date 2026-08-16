import { Markup, Telegram } from "telegraf";
import { User } from "../users/user.entity";
import { getUser } from "../users/user.service";

export async function notifyReferrerOfNewRegistration(telegram: Telegram, newUser: User): Promise<void> {
  if (!newUser.referredBy) {
    return;
  }

  const referrer = await getUser(newUser.referredBy);
  if (!referrer?.isRegistered) {
    return;
  }

  try {
    await telegram.sendMessage(
      referrer.telegramId,
      "🎉 Tabriklaymiz! Sizning do'stingiz ro'yxatdan o'tdi!",
      Markup.inlineKeyboard([
        [Markup.button.callback("🏆 Sertifikatni yuklab olish", "get_certificate")],
      ])
    );
  } catch (err) {
    console.warn(`Could not notify referrer ${referrer.telegramId}:`, err);
  }
}
