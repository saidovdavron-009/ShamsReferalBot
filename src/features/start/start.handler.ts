import {Telegraf} from "telegraf";
import {findOrCreateUser, setAwaitingRegistration} from "../users/user.service";
import registeredMenuKeyboard, {mainMenuKeyboard} from "./start.keyboard";

const WELCOME_TEXT = "✅ Assalomu alaykum, botimizga xush kelibsiz!";

export function registerStartHandler(bot: Telegraf): void {
    bot.start(async (ctx) => {
        const telegramId = String(ctx.from.id);
        const username = ctx.from.username ?? null;
        const payload = ctx.startPayload?.trim() || null;
        const referredBy = payload && /^\d+$/.test(payload) ? payload : null;

        const user = await findOrCreateUser(telegramId, username, referredBy);

        if (user.awaitingRegistration) {
            await setAwaitingRegistration(telegramId, false);
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
