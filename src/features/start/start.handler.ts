import {Telegraf} from "telegraf";
import {findOrCreateUser, setRegistrationStep} from "../users/user.service";
import registeredMenuKeyboard, {mainMenuKeyboard} from "./start.keyboard";

const WELCOME_TEXT = "Assalomu alaykum! Shams o‘quv markazining rasmiy aksiyalar botiga xush kelibsiz! 🎉\n\n" +
    "4 yillik faoliyatimiz munosabati bilan katta aksiya e’lon qilamiz!\n\n" +
    "🎁 Siz hozirning oʻzidayoq 1 000 000 soʻmgacha chegirma vaucherini qoʻlga kiritishingiz va professional ustozlardan taʼlim olishingiz mumkin.\n\n" +
    "Ilgari individual dars narxlari:\n" +
    "• 15 dars — 1 700 000 so‘m\n" +
    "• 20 dars — 2 300 000 so‘m\n" +
    "• 25 dars — 2 800 000 so‘m\n\n" +
    "Hozir maxsus aksiya bilan:\n" +
    "• 15 dars — atigi 700 000 so‘m\n" +
    "• 20 dars — atigi 1 300 000 so‘m\n" +
    "• 25 dars — atigi 1 800 000 so‘m\n\n" +
    "Bu — premium sifat, professional ustozlar va isbotlangan natija.\n\n" +
    "20 kun ichida yozilsangiz, shu narx 5 oy davomida amal qiladi.\n\n" +
    "💡 Vaucherni faollashtirish uchun bir necha soniyada roʻyxatdan oʻting.";

export function registerStartHandler(bot: Telegraf): void {
    bot.start(async (ctx) => {
        const telegramId = String(ctx.from.id);
        const username = ctx.from.username ?? null;
        const payload = ctx.startPayload?.trim() || null;
        const referralMatch = payload?.match(/^ref_(\d+)$/);
        const referredBy = referralMatch ? referralMatch[1] : null;

        const user = await findOrCreateUser(telegramId, username, referredBy);

        if (user.registrationStep) {
            await setRegistrationStep(telegramId, null);
        }

        if (user.isRegistered) {
            await ctx.reply(
                `✅ Xush kelibsiz, ${user.fullName}!\n\n` +
                `🤝 Do'stingizni taklif qiling va 1 000 000 so'mlik vaucherni qo'lga kiriting!`,
                registeredMenuKeyboard
            );
            return;
        }

        await ctx.reply(WELCOME_TEXT, mainMenuKeyboard);
    });
}
