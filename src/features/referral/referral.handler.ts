import { Markup, Telegraf } from "telegraf";
import { countReferrals, getUser } from "../users/user.service";
import { safeAnswerCbQuery } from "../../shared/safe-answer-cb-query";
import { replyRequireRegistration } from "../../shared/require-registration";
import { getReferralLink } from "../../shared/referral-link";
import registeredMenuKeyboard from "../start/start.keyboard";
import { colored } from "../../shared/colored-button";

const SHARE_BUTTON_ICON_EMOJI_ID = "5431577498364158238";
const REFRESH_BUTTON_ICON_EMOJI_ID = "5377584064326804458";
const BACK_BUTTON_ICON_EMOJI_ID = "5188682361742580692";
const MAIN_MENU_ICON_EMOJI_ID = "6334492495723890409";
const MAIN_MENU_TEXT = "🏠 Asosiy menyu";
const MAIN_MENU_ENTITIES = [
  { type: "custom_emoji" as const, offset: 0, length: "🏠".length, custom_emoji_id: MAIN_MENU_ICON_EMOJI_ID },
];

// Custom emoji rendered in place of the glyphs below; the underlying
// characters are kept only as required placeholders for the entity offsets.
const ROCKET_ICON_EMOJI_ID = "5193085063998224234";
const ROCKET_PLACEHOLDER = "🚀";
const LINK_ICON_EMOJI_ID = "5944880138104607378";
const LINK_PLACEHOLDER = "🔗";
const STATUS_ICON_EMOJI_ID = "5334543204916146110";
const STATUS_PLACEHOLDER = "📊";

// Rendered bold below.
const RULES_HEADING = "Qoidalar oddiy:";
const INVITES_LABEL = "Sizning takliflaringiz";

function buildReferralMessage(referralLink: string, invitedCount: number): string {
  return (
    `${ROCKET_PLACEHOLDER} Do'stingizni taklif qiling va qo'shimcha 20% chegirmaga ega bo'ling!\n\n` +
    `${RULES_HEADING}\n` +
    "• Quyidagi maxsus havolangizni do'stlaringizga yoki guruhlarga yuboring.\n" +
    "• Do'stingiz havola orqali botga kirib kursga yozilsa, sizga avtomatik tarzda +20% qo'shimcha chegirma beriladi.\n" +
    "• Do'stingiz ham o'zining 1 000 000 so'mlik vaucheriga ega bo'ladi.\n\n" +
    `${LINK_PLACEHOLDER} Sizning shaxsiy taklif havolangiz:\n${referralLink}\n\n` +
    `${STATUS_PLACEHOLDER} ${INVITES_LABEL}: ${invitedCount} ta do'st`
  );
}

function buildReferralEntities(message: string) {
  const rocketOffset = message.indexOf(ROCKET_PLACEHOLDER);
  const rulesOffset = message.indexOf(RULES_HEADING);
  const linkOffset = message.indexOf(LINK_PLACEHOLDER);
  const statusOffset = message.indexOf(STATUS_PLACEHOLDER);
  const invitesLabelOffset = message.indexOf(INVITES_LABEL);

  return [
    rocketOffset >= 0
      ? { type: "custom_emoji" as const, offset: rocketOffset, length: ROCKET_PLACEHOLDER.length, custom_emoji_id: ROCKET_ICON_EMOJI_ID }
      : null,
    rulesOffset >= 0
      ? { type: "bold" as const, offset: rulesOffset, length: RULES_HEADING.length }
      : null,
    linkOffset >= 0
      ? { type: "custom_emoji" as const, offset: linkOffset, length: LINK_PLACEHOLDER.length, custom_emoji_id: LINK_ICON_EMOJI_ID }
      : null,
    statusOffset >= 0
      ? { type: "custom_emoji" as const, offset: statusOffset, length: STATUS_PLACEHOLDER.length, custom_emoji_id: STATUS_ICON_EMOJI_ID }
      : null,
    invitesLabelOffset >= 0
      ? { type: "bold" as const, offset: invitesLabelOffset, length: INVITES_LABEL.length }
      : null,
  ].filter((entity): entity is NonNullable<typeof entity> => entity !== null);
}

function buildReferralKeyboard(referralLink: string) {
  const shareText = "Shams o'quv markazida 1 000 000 so'mlik vaucherni qo'lga kiriting! 🎁";
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`;

  return Markup.inlineKeyboard([
    [colored(Markup.button.url("Do'stlarga ulashish", shareUrl), "success", SHARE_BUTTON_ICON_EMOJI_ID)],
    [colored(Markup.button.callback("Statistikani yangilash", "refresh_referral_stats"), "primary", REFRESH_BUTTON_ICON_EMOJI_ID)],
    [colored(Markup.button.callback("Orqaga", "back_to_menu"), "primary", BACK_BUTTON_ICON_EMOJI_ID)],
  ]);
}

export function registerReferralHandler(bot: Telegraf): void {
  bot.action("invite_friend", async (ctx) => {
    const telegramId = String(ctx.from.id);
    const user = await getUser(telegramId);

    if (!user?.isRegistered) {
      await replyRequireRegistration(ctx);
      return;
    }

    const referralLink = await getReferralLink(ctx, telegramId);
    const invitedCount = await countReferrals(telegramId);
    const message = buildReferralMessage(referralLink, invitedCount);

    await safeAnswerCbQuery(ctx);
    await ctx.reply(message, { ...buildReferralKeyboard(referralLink), entities: buildReferralEntities(message) });
  });

  bot.action("refresh_referral_stats", async (ctx) => {
    const telegramId = String(ctx.from.id);
    const user = await getUser(telegramId);

    if (!user?.isRegistered) {
      await replyRequireRegistration(ctx);
      return;
    }

    const referralLink = await getReferralLink(ctx, telegramId);
    const invitedCount = await countReferrals(telegramId);
    const message = buildReferralMessage(referralLink, invitedCount);

    try {
      await ctx.editMessageText(message, { ...buildReferralKeyboard(referralLink), entities: buildReferralEntities(message) });
      await safeAnswerCbQuery(ctx, "✅ Yangilandi");
    } catch (err) {
      await safeAnswerCbQuery(ctx, "✅ Statistikangiz o'zgarmagan");
    }
  });

  bot.action("back_to_menu", async (ctx) => {
    await safeAnswerCbQuery(ctx);

    try {
      await ctx.editMessageText(MAIN_MENU_TEXT, { ...registeredMenuKeyboard, entities: MAIN_MENU_ENTITIES });
    } catch (err) {
      await ctx.reply(MAIN_MENU_TEXT, { ...registeredMenuKeyboard, entities: MAIN_MENU_ENTITIES });
    }
  });
}
