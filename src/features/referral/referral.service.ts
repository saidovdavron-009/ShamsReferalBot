import { Telegram } from "telegraf";
import { User } from "../users/user.entity";
import { getUser, getUserByUsername } from "../users/user.service";
import { env } from "../../config/env";

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
      `🎉 ${referrer.fullName}, sizning do'stingiz ro'yxatdan o'tdi!\n\n` +
        "Do'stingiz kursga yozilsa, sizga +20% chegirma beriladi."
    );
     } catch (err) {
    console.warn(`Could not notify referrer ${referrer.telegramId}:`, err);
  }

  if (env.adminUsername) {
    const admin = await getUserByUsername(env.adminUsername);

    if (admin && admin.telegramId !== referrer.telegramId) {
      try {
        await telegram.sendMessage(
          admin.telegramId,
          `🔔 ${referrer.fullName} do'stini (${newUser.fullName ?? "noma'lum"}) taklif qilib, yana +20% chegirma qo'lga kiritdi!`
        );
      } catch (err) {
        console.warn(`Could not notify admin @${env.adminUsername} of referral:`, err);
      }
    }
  }
}
