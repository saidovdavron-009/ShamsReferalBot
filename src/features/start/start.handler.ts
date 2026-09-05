import {Telegraf} from "telegraf";
import {findOrCreateUser, setRegistrationStep} from "../users/user.service";
import registeredMenuKeyboard, {mainMenuKeyboard} from "./start.keyboard";

// Custom emoji rendered in place of the glyphs below; the underlying
// characters are kept only as required placeholders for the entity offsets.
const GIFT_ICON_EMOJI_ID = "5442939099906325301";
const GIFT_PLACEHOLDER = "🎁";
const PARTY_POPPER_ICON_EMOJI_ID = "5404736937766430301";
const PARTY_POPPER_PLACEHOLDER = "🎉";
const BULB_ICON_EMOJI_ID = "5850292279503228917";
const BULB_PLACEHOLDER = "💡";

// Rendered bold below.
const OLD_PRICES_HEADING = "Ilgari individual dars narxlari:";
const NEW_PRICES_HEADING = "Hozir maxsus aksiya bilan:";
// Rendered bold AND underlined below.
const QUALITY_LINE = "Bu — premium sifat, professional ustozlar va isbotlangan natija.";
const DEADLINE_LINE = "20 kun ichida yozilsangiz, shu narx 5 oy davomida amal qiladi.";

const WELCOME_TEXT = `Assalomu alaykum! Shams o‘quv markazining rasmiy aksiyalar botiga xush kelibsiz! ${PARTY_POPPER_PLACEHOLDER}\n\n` +
    "4 yillik faoliyatimiz munosabati bilan katta aksiya e’lon qilamiz!\n\n" +
    `${GIFT_PLACEHOLDER} Siz hozirning oʻzidayoq 1 000 000 soʻmgacha chegirma vaucherini qoʻlga kiritishingiz va professional ustozlardan taʼlim olishingiz mumkin.\n\n` +
    `${OLD_PRICES_HEADING}\n` +
    "• 15 dars — 1 700 000 so‘m\n" +
    "• 20 dars — 2 300 000 so‘m\n" +
    "• 25 dars — 2 800 000 so‘m\n\n" +
    `${NEW_PRICES_HEADING}\n` +
    "• 15 dars — atigi 700 000 so‘m\n" +
    "• 20 dars — atigi 1 300 000 so‘m\n" +
    "• 25 dars — atigi 1 800 000 so‘m\n\n" +
    `${QUALITY_LINE}\n\n` +
    `${DEADLINE_LINE}\n\n` +
    `${BULB_PLACEHOLDER} Vaucherni faollashtirish uchun bir necha soniyada roʻyxatdan oʻting.`;

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

        const giftOffset = WELCOME_TEXT.indexOf(GIFT_PLACEHOLDER);
        const partyPopperOffset = WELCOME_TEXT.indexOf(PARTY_POPPER_PLACEHOLDER);
        const bulbOffset = WELCOME_TEXT.indexOf(BULB_PLACEHOLDER);
        const oldPricesHeadingOffset = WELCOME_TEXT.indexOf(OLD_PRICES_HEADING);
        const newPricesHeadingOffset = WELCOME_TEXT.indexOf(NEW_PRICES_HEADING);
        const qualityLineOffset = WELCOME_TEXT.indexOf(QUALITY_LINE);
        const deadlineLineOffset = WELCOME_TEXT.indexOf(DEADLINE_LINE);
        const entities = [
            giftOffset >= 0
                ? { type: "custom_emoji" as const, offset: giftOffset, length: GIFT_PLACEHOLDER.length, custom_emoji_id: GIFT_ICON_EMOJI_ID }
                : null,
            partyPopperOffset >= 0
                ? { type: "custom_emoji" as const, offset: partyPopperOffset, length: PARTY_POPPER_PLACEHOLDER.length, custom_emoji_id: PARTY_POPPER_ICON_EMOJI_ID }
                : null,
            bulbOffset >= 0
                ? { type: "custom_emoji" as const, offset: bulbOffset, length: BULB_PLACEHOLDER.length, custom_emoji_id: BULB_ICON_EMOJI_ID }
                : null,
            oldPricesHeadingOffset >= 0
                ? { type: "bold" as const, offset: oldPricesHeadingOffset, length: OLD_PRICES_HEADING.length }
                : null,
            newPricesHeadingOffset >= 0
                ? { type: "bold" as const, offset: newPricesHeadingOffset, length: NEW_PRICES_HEADING.length }
                : null,
            qualityLineOffset >= 0
                ? { type: "bold" as const, offset: qualityLineOffset, length: QUALITY_LINE.length }
                : null,
            qualityLineOffset >= 0
                ? { type: "underline" as const, offset: qualityLineOffset, length: QUALITY_LINE.length }
                : null,
            deadlineLineOffset >= 0
                ? { type: "bold" as const, offset: deadlineLineOffset, length: DEADLINE_LINE.length }
                : null,
            deadlineLineOffset >= 0
                ? { type: "underline" as const, offset: deadlineLineOffset, length: DEADLINE_LINE.length }
                : null,
        ].filter((entity): entity is NonNullable<typeof entity> => entity !== null);

        await ctx.reply(WELCOME_TEXT, { ...mainMenuKeyboard, entities });
    });
}
