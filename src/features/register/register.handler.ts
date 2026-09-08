import { Markup, Telegraf, Telegram } from "telegraf";
import { User } from "../users/user.entity";
import updateGender, {
  completeRegistration,
  getOrIssueVoucher,
  getUser,
  getUserByUsername,
  markAdminContactRequested,
  markBookingRequested,
  setRegistrationStep,
  updateAge,
  updateArabicLevel,
  updateFullName,
  updatePhone,
  updateStudyForm,
  updateTariff,
} from "../users/user.service";
import { isValidFullName } from "./full-name.validator";
import { parseAge } from "./age.validator";
import { normalizePhone } from "./phone.validator";
import registeredMenuKeyboard from "../start/start.keyboard";
import { safeAnswerCbQuery } from "../../shared/safe-answer-cb-query";
import { notifyReferrerOfNewRegistration } from "../referral/referral.service";
import { getReferralLink } from "../../shared/referral-link";
import { generateCertificateBuffer } from "../certificate/certificate.service";
import { getActiveGroups } from "../groups/group.service";
import { env } from "../../config/env";
import { withRetry } from "../../shared/with-retry";
import { colored } from "../../shared/colored-button";

const ARABIC_LEVELS: Record<string, string> = {
  none: "Yo'q",
  beginner: "Boshlang'ich",
  intermediate: "O'rta",
  advanced: "Yuqori",
};

const GENDERS: Record<string, string> = {
  male: "Erkak",
  female: "Ayol",
};

const STUDY_FORMS: Record<string, string> = {
  individual: "Individual",
  mini_guruh: "Mini guruh",
};

// Custom emoji rendered in place of the leading glyph of each message below;
// the underlying character is kept only as the required placeholder for the
// entity offset.
function leadingEmojiEntity(text: string, placeholder: string, customEmojiId: string) {
  const offset = text.indexOf(placeholder);
  return offset >= 0
    ? [{ type: "custom_emoji" as const, offset, length: placeholder.length, custom_emoji_id: customEmojiId }]
    : [];
}

const TARIFFS_INFO_ICON_EMOJI_ID = "5334544901428229844";
const TARIFFS_INFO_CAP_EMOJI_ID = "6199216268738826447";
const TARIFFS_INFO_TEACHERS_EMOJI_ID = "5244698746851173535";
const TARIFFS_INFO_HEADING = "ℹ️ Tariflar haqida ma'lumot:";
const TARIFFS_INFO_INDIVIDUAL_HEADING = "🎓 Individual ta'lim";
const TARIFFS_INFO_TEACHERS_LINE = "👥 Erkaklar va ayollar uchun alohida ustozlar mavjud.";
const TARIFFS_INFO_FOOTER = "Narxlar va batafsil ma'lumot keyingi bosqichda ko'rsatiladi.";

const TARIFFS_INFO =
  `${TARIFFS_INFO_HEADING}\n\n` +
  `${TARIFFS_INFO_INDIVIDUAL_HEADING}\n` +
  "Shaxsiy (1 kishilik) darslar\n" +
  "Ustoz faqat siz bilan shug'ullanadi\n\n" +
  `${TARIFFS_INFO_TEACHERS_LINE}\n\n` +
  TARIFFS_INFO_FOOTER;

function entityAt(text: string, substring: string, type: "bold" | "underline") {
  const offset = text.indexOf(substring);
  return offset >= 0 ? [{ type: type as "bold" | "underline", offset, length: substring.length }] : [];
}

const TARIFFS_INFO_ENTITIES = [
  ...leadingEmojiEntity(TARIFFS_INFO, "ℹ️", TARIFFS_INFO_ICON_EMOJI_ID),
  ...leadingEmojiEntity(TARIFFS_INFO, "🎓", TARIFFS_INFO_CAP_EMOJI_ID),
  ...leadingEmojiEntity(TARIFFS_INFO, "👥", TARIFFS_INFO_TEACHERS_EMOJI_ID),
  ...entityAt(TARIFFS_INFO, TARIFFS_INFO_INDIVIDUAL_HEADING, "bold"),
  ...entityAt(TARIFFS_INFO, TARIFFS_INFO_FOOTER, "underline"),
];

const TARIFFS_INFO_CONTINUE_ICON_EMOJI_ID = "5314257159549113422";

const tariffsInfoKeyboard = Markup.inlineKeyboard([
  [colored(Markup.button.callback("Davom etish", "tariffs_info_continue"), "success", TARIFFS_INFO_CONTINUE_ICON_EMOJI_ID)],
]);

const NAME_UPDATED_CHECK_EMOJI_ID = "5319139772860472979";

const PHONE_ACCEPTED_CHECK_EMOJI_ID = "5780911094335805539";
const PHONE_ACCEPTED_TEXT = "✅ Telefon raqamingiz qabul qilindi.";
const PHONE_ACCEPTED_ENTITIES = leadingEmojiEntity(PHONE_ACCEPTED_TEXT, "✅", PHONE_ACCEPTED_CHECK_EMOJI_ID);

const AGE_PROMPT_CAKE_EMOJI_ID = "5310169080827753275";
const AGE_PROMPT_TEXT = "🎂 Necha yoshdasiz?\n\n(masalan: 25)";
const AGE_PROMPT_ENTITIES = leadingEmojiEntity(AGE_PROMPT_TEXT, "🎂", AGE_PROMPT_CAKE_EMOJI_ID);

const STUDY_FORM_CAP_EMOJI_ID = "5357419403325481346";
const STUDY_FORM_PROMPT_TEXT = "🎓 Qaysi ta'lim shaklida o'qishni rejalashtiryapsiz?";
const STUDY_FORM_PROMPT_ENTITIES = leadingEmojiEntity(STUDY_FORM_PROMPT_TEXT, "🎓", STUDY_FORM_CAP_EMOJI_ID);

const NAME_PROMPT = "Iltimos, ism va familiyangizni yozib qoldiring: (Masalan: Ali Valiyev)";
const NAME_INVALID = "🙏 Kechirasiz, kiritilgan ma'lumot to'g'ri ko'rinmayapti.\n\n" +
  "Iltimos, ism va familiyangizni faqat harflardan foydalanib, bo'sh joy bilan ajratib qayta yozing.\n\n" +
  "Masalan: Saidov Davron ✍️";

// Temporary: testing custom emoji icons on these buttons, per user request.
const ARABIC_LEVEL_NONE_ICON_EMOJI_ID = "5456391293959690823";
const ARABIC_LEVEL_BEGINNER_ICON_EMOJI_ID = "5373275688142921050";
const ARABIC_LEVEL_INTERMEDIATE_ICON_EMOJI_ID = "5372795742727460202";
const ARABIC_LEVEL_ADVANCED_ICON_EMOJI_ID = "5372974379007239288";

const arabicLevelKeyboard = Markup.inlineKeyboard([
  [
    colored(Markup.button.callback("Yo'q", "arabic_level:none"), "danger", ARABIC_LEVEL_NONE_ICON_EMOJI_ID),
    colored(Markup.button.callback("Boshlang'ich", "arabic_level:beginner"), "primary", ARABIC_LEVEL_BEGINNER_ICON_EMOJI_ID),
  ],
  [
    colored(Markup.button.callback("O'rta", "arabic_level:intermediate"), "primary", ARABIC_LEVEL_INTERMEDIATE_ICON_EMOJI_ID),
    colored(Markup.button.callback("Yuqori", "arabic_level:advanced"), "success", ARABIC_LEVEL_ADVANCED_ICON_EMOJI_ID),
  ],
]);

// Temporary: testing custom emoji icons on these buttons, per user request.
const GENDER_MALE_ICON_EMOJI_ID = "5285535218592139806";
const GENDER_FEMALE_ICON_EMOJI_ID = "5361657960521023916";

const genderKeyboard = Markup.inlineKeyboard([
  [
    colored(Markup.button.callback("Erkak", "gender:male"), "success", GENDER_MALE_ICON_EMOJI_ID),
    colored(Markup.button.callback("Ayol", "gender:female"), "danger", GENDER_FEMALE_ICON_EMOJI_ID),
  ],
]);

const studyFormKeyboard = Markup.inlineKeyboard([
  [
    colored(Markup.button.callback("Erkaklar uchun – Individual", "study_form:individual"), "success", GENDER_MALE_ICON_EMOJI_ID),
    colored(Markup.button.callback("Ayollar uchun - Individual", "study_form:mini_guruh"), "danger", GENDER_FEMALE_ICON_EMOJI_ID),
  ],
  [colored(Markup.button.callback("Tariflar haqida ma'lumot", "tariffs_info"), "primary", TARIFFS_INFO_ICON_EMOJI_ID)],
]);

interface TariffInfo {
  label: string;
  lessons: number;
  oldPrice: number;
  newPrice: number;
  iconEmojiId: string;
}

const TARIFFS: Record<string, TariffInfo> = {
  yengil: { label: "Yengil", lessons: 15, oldPrice: 1_700_000, newPrice: 700_000, iconEmojiId: "5319139772860472979" },
  orta: { label: "O'rta", lessons: 20, oldPrice: 2_300_000, newPrice: 1_300_000, iconEmojiId: "5318967574736676420" },
  katta: { label: "Katta", lessons: 25, oldPrice: 2_800_000, newPrice: 1_800_000, iconEmojiId: "5318881353268208351" },
};

function formatPrice(price: number): string {
  return price.toLocaleString("ru-RU").replace(/,/g, " ");
}

type TextEntity =
  | { type: "bold" | "underline"; offset: number; length: number }
  | { type: "custom_emoji"; offset: number; length: number; custom_emoji_id: string };

// Built imperatively (rather than as a plain template string) so bold/underline/
// custom-emoji entity offsets can be tracked precisely as each bold tariff
// label and repeated 🔥 placeholder is appended.
function buildTariffSelectionMessage(): { text: string; entities: TextEntity[] } {
  let text = "";
  const entities: TextEntity[] = [];

  const appendPlain = (chunk: string) => {
    text += chunk;
  };
  const appendBold = (chunk: string) => {
    entities.push({ type: "bold", offset: text.length, length: chunk.length });
    text += chunk;
  };
  const appendCustomEmoji = (placeholder: string, customEmojiId: string) => {
    entities.push({ type: "custom_emoji", offset: text.length, length: placeholder.length, custom_emoji_id: customEmojiId });
    text += placeholder;
  };

  appendBold("Tarif tanlash");
  appendPlain("\n\n");
  appendPlain("Tarifni tanlang:\n\n");

  Object.values(TARIFFS).forEach((t, index) => {
    appendCustomEmoji("🔥", t.iconEmojiId);
    appendPlain(" ");
    appendBold(`${t.label} — ${t.lessons} dars`);
    appendPlain(`\nIlgari: ${formatPrice(t.oldPrice)} → Hozir: ${formatPrice(t.newPrice)} so'm`);
    if (index < Object.values(TARIFFS).length - 1) {
      appendPlain("\n\n");
    }
  });

  appendPlain("\n\n· ");
  const daysLine = "Darslar kunlarga emas, soniga qarab hisoblanadi";
  entities.push({ type: "bold", offset: text.length, length: daysLine.length });
  entities.push({ type: "underline", offset: text.length, length: daysLine.length });
  appendPlain(daysLine);

  return { text, entities };
}

const TARIFF_SELECTION = buildTariffSelectionMessage();

const TARIFF_BUTTON_ICON_EMOJI_ID = "5411383738959405731";
const TARIFF_BACK_BUTTON_ICON_EMOJI_ID = "5188682361742580692";

const tariffKeyboard = Markup.inlineKeyboard([
  ...Object.entries(TARIFFS).map(([key, t]) => [
    colored(Markup.button.callback(`${t.label} tarif — ${formatPrice(t.newPrice)}`, `tariff:${key}`), "primary", TARIFF_BUTTON_ICON_EMOJI_ID),
  ]),
  [colored(Markup.button.callback("Orqaga", "tariff_back"), "danger", TARIFF_BACK_BUTTON_ICON_EMOJI_ID)],
]);

const CONFIRM_BUTTON_ICON_EMOJI_ID = "5445118546700954082";
const CHANGE_TARIFF_BUTTON_ICON_EMOJI_ID = "5377584064326804458";

const confirmationKeyboard = Markup.inlineKeyboard([
  [colored(Markup.button.callback("Ha, tasdiqlayman", "confirm_registration"), "success", CONFIRM_BUTTON_ICON_EMOJI_ID)],
  [colored(Markup.button.callback("Tarifni o'zgartirish", "change_tariff"), "primary", CHANGE_TARIFF_BUTTON_ICON_EMOJI_ID)],
]);

function buildConfirmationMessage(user: {
  fullName: string | null;
  phone: string | null;
  gender: string | null;
  tariff: string | null;
}): { text: string; entities: TextEntity[] } {
  const tariffInfo = user.tariff ? TARIFFS[user.tariff] : null;

  let text = "";
  const entities: TextEntity[] = [];

  const appendPlain = (chunk: string) => {
    text += chunk;
  };
  const appendBold = (chunk: string) => {
    entities.push({ type: "bold", offset: text.length, length: chunk.length });
    text += chunk;
  };

  appendBold("Siz tanladingiz:");
  appendPlain("\n\n");
  appendBold("Ism:");
  appendPlain(` ${user.fullName ?? "-"}\n`);
  appendBold("Telefon:");
  appendPlain(` ${user.phone ?? "-"}\n`);
  appendBold("Jins:");
  appendPlain(` ${user.gender ? GENDERS[user.gender] : "-"}\n`);
  appendBold("Tarif:");
  appendPlain(` ${tariffInfo?.label ?? "-"}\n`);
  appendBold("Narx:");
  appendPlain(` ${tariffInfo ? formatPrice(tariffInfo.newPrice) : "-"} so'm`);

  return { text, entities };
}

// Temporary: testing a custom emoji icon on this button, per user request.
const PHONE_REQUEST_ICON_EMOJI_ID = "5406809207947142040";

const phoneRequestKeyboard = Markup.keyboard([
  [colored(Markup.button.contactRequest("Telefon raqamni yuborish"), "success", PHONE_REQUEST_ICON_EMOJI_ID)],
]).resize();

const BOOKING_FIRE_EMOJI_ID = "5456474427346671397";
const BOOKING_PIN_EMOJI_ID = "5242751808111125319";
const BOOKING_PHONE_EMOJI_ID = "5474288573005964288";

const BOOKING_MESSAGE =
  "🔥 Hozir yozilsangiz — 5 oy shu narxda o'qiysiz!\n\n" +
  "Aksiya faqat \"1 hafta\" davom etadi.\n" +
  "Shu 1 hafta ichida yozilganlar 5 oy davomida hozirgi chegirmali narxda to'lab o'qiydi.\n\n" +
  "1 haftadan keyin narxlar o'zgaradi.\n\n" +
  "Administrator tez orada siz bilan bog'lanib, dars vaqtini belgilaydi.\n\n" +
  "📍 Format: Onlayn (Zoom)\n" +
  "📞 Aloqa: @Shams_markaz_admin";

const BOOKING_MESSAGE_ENTITIES = [
  ...leadingEmojiEntity(BOOKING_MESSAGE, "🔥", BOOKING_FIRE_EMOJI_ID),
  ...leadingEmojiEntity(BOOKING_MESSAGE, "📍", BOOKING_PIN_EMOJI_ID),
  ...leadingEmojiEntity(BOOKING_MESSAGE, "📞", BOOKING_PHONE_EMOJI_ID),
];

const ADMIN_CONTACT_URL = "https://t.me/Shams_markaz_admin";

const adminContactLinkKeyboard = Markup.inlineKeyboard([
  [colored(Markup.button.url("💬 Admin bilan bog'lanish", ADMIN_CONTACT_URL), "primary")],
]);

const INVITE_FRIEND_BUTTON_ICON_EMOJI_ID = "5417974701282571313";
const TRIAL_LESSON_BUTTON_ICON_EMOJI_ID = "5373251851074415873";
const RESERVE_SPOT_BUTTON_ICON_EMOJI_ID = "6337072065966771574";

const voucherKeyboard = Markup.inlineKeyboard([
  [colored(Markup.button.callback("Do'stni taklif qilib, yana -20% olish", "invite_friend"), "success", INVITE_FRIEND_BUTTON_ICON_EMOJI_ID)],
  [colored(Markup.button.callback("Sinov darsiga yozilish", "trial_lesson"), "primary", TRIAL_LESSON_BUTTON_ICON_EMOJI_ID)],
  [colored(Markup.button.callback("Joyni band qilish (300 000 so'm)", "reserve_spot"), "success", RESERVE_SPOT_BUTTON_ICON_EMOJI_ID)],
]);

const VOUCHER_OWNER_ICON_EMOJI_ID = "6003826425348494295";
const VOUCHER_ID_ICON_EMOJI_ID = "5319118551427078910";
const VOUCHER_DISCOUNT_ICON_EMOJI_ID = "5318908819584074855";
const VOUCHER_DATE_ICON_EMOJI_ID = "5251521246566307049";
const VOUCHER_FIRE_ICON_EMOJI_ID = "5285376730003954510";
const VOUCHER_SPARKLE_ICON_EMOJI_ID = "5823347218056221496";
const VOUCHER_SPARKLE_PLACEHOLDER = "✨";
const VOUCHER_LIGHTNING_ICON_EMOJI_ID = "5417974701282571313";

// The short "Egasi ... Amal qilish muddati" header is shared between
// the full voucher message sent to the user (which continues on with tariffs
// and buttons) and the standalone summary posted to admin/group/channels.
function buildVoucherHeader(fullName: string | null, telegramId: string): { text: string; entities: TextEntity[] } {
  let text = "";
  const entities: TextEntity[] = [];

  const appendPlain = (chunk: string) => {
    text += chunk;
  };
  const appendBold = (chunk: string) => {
    entities.push({ type: "bold", offset: text.length, length: chunk.length });
    text += chunk;
  };
  const appendCustomEmoji = (placeholder: string, customEmojiId: string) => {
    entities.push({ type: "custom_emoji", offset: text.length, length: placeholder.length, custom_emoji_id: customEmojiId });
    text += placeholder;
  };

  appendCustomEmoji("👤", VOUCHER_OWNER_ICON_EMOJI_ID);
  appendPlain(" ");
  appendBold("Egasi:");
  appendPlain(` ${fullName}\n`);
  appendCustomEmoji("🆔", VOUCHER_ID_ICON_EMOJI_ID);
  appendPlain(" ");
  appendBold("ID:");
  appendPlain(` #SHAMS-${telegramId}\n`);
  appendCustomEmoji("💰", VOUCHER_DISCOUNT_ICON_EMOJI_ID);
  appendPlain(" ");
  appendBold("Chegirma:");
  appendPlain(" 1 000 000 so'mgacha\n");
  appendCustomEmoji("📅", VOUCHER_DATE_ICON_EMOJI_ID);
  appendPlain(" ");
  appendBold("Amal qilish muddati:");
  appendPlain(" 1 hafta");

  return { text, entities };
}

function buildVoucherMessage(fullName: string | null, telegramId: string): { text: string; entities: TextEntity[] } {
  const header = buildVoucherHeader(fullName, telegramId);
  let text = header.text;
  const entities: TextEntity[] = [...header.entities];

  const appendPlain = (chunk: string) => {
    text += chunk;
  };
  const appendBold = (chunk: string) => {
    entities.push({ type: "bold", offset: text.length, length: chunk.length });
    text += chunk;
  };
  const appendCustomEmoji = (placeholder: string, customEmojiId: string) => {
    entities.push({ type: "custom_emoji", offset: text.length, length: placeholder.length, custom_emoji_id: customEmojiId });
    text += placeholder;
  };

  appendPlain("\n\n________________________\n\n");
  appendCustomEmoji("🔥", VOUCHER_FIRE_ICON_EMOJI_ID);
  appendPlain(" ");
  appendBold("Aksiya narxlari:");
  appendPlain("\n\n");

  const voucherTariffs: Array<{ label: string; lessons: number; oldPrice: number; newPrice: number }> = [
    { label: "Yengil", lessons: TARIFFS.yengil.lessons, oldPrice: TARIFFS.yengil.oldPrice, newPrice: TARIFFS.yengil.newPrice },
    { label: "O'rta", lessons: TARIFFS.orta.lessons, oldPrice: TARIFFS.orta.oldPrice, newPrice: TARIFFS.orta.newPrice },
    { label: "Mega", lessons: TARIFFS.katta.lessons, oldPrice: TARIFFS.katta.oldPrice, newPrice: TARIFFS.katta.newPrice },
  ];

  voucherTariffs.forEach((t, index) => {
    appendBold(`${t.label} tarif (${t.lessons} dars)`);
    appendPlain(`\n${formatPrice(t.oldPrice)} → ${formatPrice(t.newPrice)} so'm`);
    if (index < voucherTariffs.length - 1) {
      appendPlain("\n\n");
    }
  });

  appendPlain("\n\n________________________\n\n");
  appendCustomEmoji(VOUCHER_SPARKLE_PLACEHOLDER, VOUCHER_SPARKLE_ICON_EMOJI_ID);
  appendPlain(" Bu — 4 yillik tajriba va premium sifat.\n");
  appendPlain("Hozir yozilsangiz, shu narx 5 oy saqlanadi.\n\n");
  appendCustomEmoji("⚡️", VOUCHER_LIGHTNING_ICON_EMOJI_ID);
  appendPlain(" ");
  appendBold("Do'stingizni taklif qilsangiz — yana qo'shimcha 20% chegirma olasiz!");

  return { text, entities };
}

// Runs after the user already has their voucher photo and text/buttons in
// hand, so a slow admin/channel upload never delays that reply. Errors are
// caught and logged per-step rather than propagated, since nothing awaits
// this call.
async function sendVoucherSideEffects(telegram: Telegram, registeredUser: User, voucherImage: Buffer | null): Promise<void> {
  const adminTask = (async () => {
    if (!env.adminUsername) {
      return;
    }

    const admin = await getUserByUsername(env.adminUsername);
    if (!admin) {
      return;
    }

    if (voucherImage && admin.telegramId !== registeredUser.telegramId) {
      let caption = `🔔 Yangi vaucher: ${registeredUser.fullName} (@${registeredUser.username ?? "noma'lum"})`;

      if (registeredUser.referredBy) {
        const referrer = await getUser(registeredUser.referredBy);
        if (referrer?.fullName) {
          caption += `\n👥 ${referrer.fullName} orqali ro'yxatdan o'tdi`;
        }
      }

      try {
        await withRetry(() => telegram.sendPhoto(admin.telegramId, { source: voucherImage }, { caption }));
      } catch (err) {
        console.error(`Could not forward voucher to admin @${env.adminUsername}:`, err);
      }
    }
  })();

  const channelsTask = (async () => {
    if (!voucherImage) {
      return;
    }

    // Bot admin qilib qo'shilgan barcha faol guruh/kanallarga ham vaucher
    // yuboriladi. Kanallar bir-biriga bog'liq emas, shuning uchun parallel
    // yuboriladi.
    const header = buildVoucherHeader(registeredUser.fullName, registeredUser.telegramId);
    const channels = await getActiveGroups();
    await Promise.all(
      channels.map((channel) =>
        withRetry(() => telegram.sendPhoto(channel.chatId, { source: voucherImage }))
          .then(() => withRetry(() => telegram.sendMessage(channel.chatId, header.text, { entities: header.entities })))
          .catch((err) => console.error(`Could not send voucher to channel ${channel.chatId}:`, err))
      )
    );
  })();

  await Promise.all([adminTask, channelsTask]);
}

export function registerRegisterHandler(bot: Telegraf): void {
  bot.action("register_start", async (ctx) => {
    const telegramId = String(ctx.from.id);
    const user = await getUser(telegramId);

    await safeAnswerCbQuery(ctx);

    if (user?.isRegistered) {
      await ctx.reply(`Siz allaqachon ro'yxatdan o'tgansiz, ${user.fullName}! ✅`);
      return;
    }

    await setRegistrationStep(telegramId, "name");
    await ctx.reply(NAME_PROMPT);
  });

  bot.action("edit_name", async (ctx) => {
    const telegramId = String(ctx.from.id);

    await safeAnswerCbQuery(ctx);
    await setRegistrationStep(telegramId, "edit_name");
    await ctx.reply(NAME_PROMPT);
  });

  bot.action(/^arabic_level:(none|beginner|intermediate|advanced)$/, async (ctx) => {
    const telegramId = String(ctx.from.id);
    const user = await getUser(telegramId);

    if (user?.registrationStep !== "arabic_level") {
      await safeAnswerCbQuery(ctx);
      return;
    }

    const level = ctx.match[1];
    await safeAnswerCbQuery(ctx, `✅ ${ARABIC_LEVELS[level]}`);
    await updateArabicLevel(telegramId, level);
    await setRegistrationStep(telegramId, "gender");
    await ctx.reply("👤 Jinsingizni tanlang:", genderKeyboard);
  });

  bot.action(/^gender:(male|female)$/, async (ctx) => {
    const telegramId = String(ctx.from.id);
    const user = await getUser(telegramId);

    if (user?.registrationStep !== "gender") {
      await safeAnswerCbQuery(ctx);
      return;
    }

    const gender = ctx.match[1];
    await safeAnswerCbQuery(ctx, `✅ ${GENDERS[gender]}`);
    await updateGender(telegramId, gender);
    await setRegistrationStep(telegramId, "study_form");
    await ctx.reply(STUDY_FORM_PROMPT_TEXT, { ...studyFormKeyboard, entities: STUDY_FORM_PROMPT_ENTITIES });
  });

  bot.action(/^study_form:(individual|mini_guruh)$/, async (ctx) => {
    const telegramId = String(ctx.from.id);
    const user = await getUser(telegramId);

    if (user?.registrationStep !== "study_form") {
      await safeAnswerCbQuery(ctx);
      return;
    }

    const studyForm = ctx.match[1];
    await safeAnswerCbQuery(ctx, `✅ ${STUDY_FORMS[studyForm]}`);
    await updateStudyForm(telegramId, studyForm);
    await setRegistrationStep(telegramId, "tariff");
    await ctx.reply(TARIFF_SELECTION.text, { ...tariffKeyboard, entities: TARIFF_SELECTION.entities });
  });

  bot.action("tariffs_info", async (ctx) => {
    await safeAnswerCbQuery(ctx);
    await ctx.reply(TARIFFS_INFO, { ...tariffsInfoKeyboard, entities: TARIFFS_INFO_ENTITIES });
  });

  bot.action("tariffs_info_continue", async (ctx) => {
    await safeAnswerCbQuery(ctx);
    await ctx.reply(STUDY_FORM_PROMPT_TEXT, { ...studyFormKeyboard, entities: STUDY_FORM_PROMPT_ENTITIES });
  });

  bot.action("tariff_back", async (ctx) => {
    const telegramId = String(ctx.from.id);
    const user = await getUser(telegramId);

    if (user?.registrationStep !== "tariff") {
      await safeAnswerCbQuery(ctx);
      return;
    }

    await safeAnswerCbQuery(ctx);
    await setRegistrationStep(telegramId, "study_form");
    await ctx.reply(STUDY_FORM_PROMPT_TEXT, { ...studyFormKeyboard, entities: STUDY_FORM_PROMPT_ENTITIES });
  });

  bot.action(/^tariff:(yengil|orta|katta)$/, async (ctx) => {
    const telegramId = String(ctx.from.id);
    const user = await getUser(telegramId);

    if (user?.registrationStep !== "tariff") {
      await safeAnswerCbQuery(ctx);
      return;
    }

    const tariff = ctx.match[1];
    await safeAnswerCbQuery(ctx, `✅ ${TARIFFS[tariff].label}`);
    await updateTariff(telegramId, tariff);
    await setRegistrationStep(telegramId, "confirm");

    const updatedUser = await getUser(telegramId);
    if (updatedUser) {
      const confirmationMessage = buildConfirmationMessage(updatedUser);
      await ctx.reply(confirmationMessage.text, { ...confirmationKeyboard, entities: confirmationMessage.entities });
    }
  });

  bot.action("change_tariff", async (ctx) => {
    const telegramId = String(ctx.from.id);
    const user = await getUser(telegramId);

    if (user?.registrationStep !== "confirm") {
      await safeAnswerCbQuery(ctx);
      return;
    }

    await safeAnswerCbQuery(ctx);
    await setRegistrationStep(telegramId, "tariff");
    await ctx.reply(TARIFF_SELECTION.text, { ...tariffKeyboard, entities: TARIFF_SELECTION.entities });
  });

  bot.action("confirm_registration", async (ctx) => {
    const telegramId = String(ctx.from.id);
    const user = await getUser(telegramId);

    if (user?.registrationStep !== "confirm") {
      await safeAnswerCbQuery(ctx);
      return;
    }

    await safeAnswerCbQuery(ctx, "✅ Tasdiqlandi");
    await completeRegistration(telegramId);

    const registeredUser = await getUser(telegramId);

    if (registeredUser && registeredUser.fullName) {
      // The voucher photo + text/buttons are what the user is actively
      // waiting on, so they're sent first, back-to-back. The admin forward
      // and the group/channel broadcast are side effects the
      // user never sees — they used to run sequentially *before* this reply,
      // which made the "tayyor bo'ldi" message crawl in after a long chain of
      // uploads. They now run afterwards, off the critical path.
      let voucherImage: Buffer | null = null;
      try {
        const { issuedAt } = await getOrIssueVoucher(telegramId);
        const referralLink = await getReferralLink(ctx, telegramId);
        const image = await generateCertificateBuffer(registeredUser.fullName, telegramId, referralLink, issuedAt);
        voucherImage = image;
        await withRetry(() => ctx.replyWithPhoto({ source: image }));
      } catch (err) {
        console.error(`Could not generate/send voucher image for ${telegramId}:`, err);
      }

      const voucherMessage = buildVoucherMessage(registeredUser.fullName, telegramId);
      await ctx.reply(voucherMessage.text, { ...voucherKeyboard, entities: voucherMessage.entities });
      await notifyReferrerOfNewRegistration(ctx.telegram, registeredUser);

      void sendVoucherSideEffects(ctx.telegram, registeredUser, voucherImage);
    }
  });

  bot.action(["trial_lesson", "reserve_spot"], async (ctx) => {
    const telegramId = String(ctx.from.id);
    await markBookingRequested(telegramId);
    // The button below is a direct link (no callback), so there's no later
    // click event to hook into — mark admin-contact here, at the moment the
    // direct-contact button is shown, so 24h/40h reminders correctly stop
    // for users who reached this point.
    await markAdminContactRequested(telegramId);
    await safeAnswerCbQuery(ctx);
    await ctx.reply(BOOKING_MESSAGE, { ...adminContactLinkKeyboard, entities: BOOKING_MESSAGE_ENTITIES });
  });

  bot.action("contact_admin", async (ctx) => {
    const telegramId = String(ctx.from.id);
    await markAdminContactRequested(telegramId);
    await safeAnswerCbQuery(ctx);
    await ctx.reply("👉 Admin bilan bog'lanish uchun quyidagi tugmani bosing:", adminContactLinkKeyboard);
  });

  bot.on("contact", async (ctx, next) => {
    const telegramId = String(ctx.from.id);
    const user = await getUser(telegramId);

    if (user?.registrationStep !== "phone") {
      return next();
    }

    if (ctx.message.contact.user_id !== ctx.from.id) {
      await ctx.reply("🙏 Iltimos, faqat o'zingizning telefon raqamingizni yuboring.");
      return;
    }

    const phone = normalizePhone(ctx.message.contact.phone_number);
    if (!phone) {
      await ctx.reply("🙏 Telefon raqam noto'g'ri ko'rinmoqda, qaytadan urinib ko'ring.");
      return;
    }

    await updatePhone(telegramId, phone);
    await setRegistrationStep(telegramId, "age");

    await ctx.reply(PHONE_ACCEPTED_TEXT, { ...Markup.removeKeyboard(), entities: PHONE_ACCEPTED_ENTITIES });
    await ctx.reply(AGE_PROMPT_TEXT, { entities: AGE_PROMPT_ENTITIES });
  });

  bot.on("text", async (ctx, next) => {
    const telegramId = String(ctx.from.id);
    const user = await getUser(telegramId);

    if (!user?.registrationStep) {
      return next();
    }

    const text = ctx.message.text.trim();

    switch (user.registrationStep) {
      case "name": {
        if (!isValidFullName(text)) {
          await ctx.reply(NAME_INVALID);
          return;
        }

        await updateFullName(telegramId, text);
        await setRegistrationStep(telegramId, "phone");
        await ctx.reply(
          `Rahmat, ${text}! Endi siz bilan bog'lanishimiz va vaucherni nomingizga biriktirishimiz uchun telefon raqamingizni yuboring:`,
          phoneRequestKeyboard
        );
        return;
      }

      case "phone": {
        const phone = normalizePhone(text);
        if (!phone) {
          await ctx.reply("🙏 Telefon raqam noto'g'ri ko'rinmoqda. Pastdagi tugmani bosing yoki qaytadan yozing:");
          return;
        }

        await updatePhone(telegramId, phone);
        await setRegistrationStep(telegramId, "age");
        await ctx.reply(PHONE_ACCEPTED_TEXT, { ...Markup.removeKeyboard(), entities: PHONE_ACCEPTED_ENTITIES });
        await ctx.reply(AGE_PROMPT_TEXT, { entities: AGE_PROMPT_ENTITIES });
        return;
      }

      case "age": {
        const age = parseAge(text);
        if (age === null) {
          await ctx.reply("🙏 Iltimos, yoshingizni raqamda to'g'ri kiriting (masalan: 25):");
          return;
        }

        await updateAge(telegramId, age);
        await setRegistrationStep(telegramId, "arabic_level");
        await ctx.reply("📖 Arab tili bilim darajangizni tanlang:", arabicLevelKeyboard);
        return;
      }

      case "arabic_level": {
        await ctx.reply("👆 Iltimos, arab tili darajangizni pastdagi tugmalar orqali tanlang:", arabicLevelKeyboard);
        return;
      }

      case "gender": {
        await ctx.reply("👆 Iltimos, jinsingizni pastdagi tugmalar orqali tanlang:", genderKeyboard);
        return;
      }

      case "study_form": {
        await ctx.reply("👆 Iltimos, ta'lim shaklini pastdagi tugmalar orqali tanlang:", studyFormKeyboard);
        return;
      }

      case "tariff": {
        await ctx.reply("👆 Iltimos, tarifni pastdagi tugmalar orqali tanlang:", tariffKeyboard);
        return;
      }

      case "confirm": {
        const confirmingUser = await getUser(telegramId);
        if (confirmingUser) {
          const confirmationMessage = buildConfirmationMessage(confirmingUser);
          await ctx.reply(confirmationMessage.text, { ...confirmationKeyboard, entities: confirmationMessage.entities });
        }
        return;
      }

      case "edit_name": {
        if (!isValidFullName(text)) {
          await ctx.reply(NAME_INVALID);
          return;
        }

        await updateFullName(telegramId, text);
        await setRegistrationStep(telegramId, null);
        const nameUpdatedText = `✅ Ma'lumotlaringiz yangilandi. Endi siz ${text} deb qayd etildingiz.`;
        await ctx.reply(nameUpdatedText, {
          ...registeredMenuKeyboard,
          entities: leadingEmojiEntity(nameUpdatedText, "✅", NAME_UPDATED_CHECK_EMOJI_ID),
        });
        return;
      }

      default:
        return next();
    }
  });
}
