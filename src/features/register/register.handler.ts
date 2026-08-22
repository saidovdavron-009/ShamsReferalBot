import { Markup, Telegraf } from "telegraf";
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

const TARIFFS_INFO =
  "ℹ️ Tariflar haqida ma'lumot:\n\n" +
  "👨‍🎓 Individual — erkaklar uchun, shaxsiy (bir kishilik) darslar.\n" +
  "👩‍🎓 Mini guruh — ayollar uchun, kichik guruhlarda o'tkaziladigan darslar.\n\n" +
  "Narxlar va batafsil ma'lumot uchun administrator bilan bog'lanishingiz mumkin.";

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
const GENDER_MALE_ICON_EMOJI_ID = "5292251546715693316";
const GENDER_FEMALE_ICON_EMOJI_ID = "5361956855885086373";

const genderKeyboard = Markup.inlineKeyboard([
  [
    colored(Markup.button.callback("Erkak", "gender:male"), "success", GENDER_MALE_ICON_EMOJI_ID),
    colored(Markup.button.callback("Ayol", "gender:female"), "danger", GENDER_FEMALE_ICON_EMOJI_ID),
  ],
]);

const studyFormKeyboard = Markup.inlineKeyboard([
  [
    colored(Markup.button.callback("👨‍🎓 Erkaklar uchun – Individual", "study_form:individual"), "success"),
    colored(Markup.button.callback("👩‍🎓 Ayollar uchun – Mini guruh", "study_form:mini_guruh"), "danger"),
  ],
  [Markup.button.callback("ℹ️ Tariflar haqida ma'lumot", "tariffs_info")],
]);

interface TariffInfo {
  label: string;
  lessons: number;
  oldPrice: number;
  newPrice: number;
}

const TARIFFS: Record<string, TariffInfo> = {
  yengil: { label: "Yengil", lessons: 15, oldPrice: 1_700_000, newPrice: 700_000 },
  orta: { label: "O'rta", lessons: 20, oldPrice: 2_300_000, newPrice: 1_300_000 },
  katta: { label: "Katta", lessons: 25, oldPrice: 2_800_000, newPrice: 1_800_000 },
};

function formatPrice(price: number): string {
  return price.toLocaleString("ru-RU").replace(/,/g, " ");
}

const TARIFF_SELECTION_MESSAGE =
  "5. Tarif tanlash\n\n" +
  "Tarifni tanlang:\n\n" +
  Object.values(TARIFFS)
    .map(
      (t) =>
        `🔥 ${t.label} — ${t.lessons} dars\n` +
        `Ilgari: ${formatPrice(t.oldPrice)} → Hozir: ${formatPrice(t.newPrice)} so'm`
    )
    .join("\n\n") +
  "\n\n· Darslar kunlarga emas, soniga qarab hisoblanadi";

const tariffKeyboard = Markup.inlineKeyboard([
  ...Object.entries(TARIFFS).map(([key, t]) => [
    colored(Markup.button.callback(`${t.label} tarif — ${formatPrice(t.newPrice)}`, `tariff:${key}`), "primary"),
  ]),
  [colored(Markup.button.callback("⬅️ Orqaga", "tariff_back"), "danger")],
]);

const confirmationKeyboard = Markup.inlineKeyboard([
  [colored(Markup.button.callback("✅ Ha, tasdiqlayman", "confirm_registration"), "success")],
  [colored(Markup.button.callback("🔄 Tarifni o'zgartirish", "change_tariff"), "primary")],
]);

function buildConfirmationMessage(user: {
  fullName: string | null;
  phone: string | null;
  gender: string | null;
  tariff: string | null;
}): string {
  const tariffInfo = user.tariff ? TARIFFS[user.tariff] : null;

  return (
    "Siz tanladingiz:\n\n" +
    `Ism: ${user.fullName ?? "-"}\n` +
    `Telefon: ${user.phone ?? "-"}\n` +
    `Jins: ${user.gender ? GENDERS[user.gender] : "-"}\n` +
    `Tarif: ${tariffInfo?.label ?? "-"}\n` +
    `Narx: ${tariffInfo ? formatPrice(tariffInfo.newPrice) : "-"} so'm`
  );
}

// Temporary: testing a custom emoji icon on this button, per user request.
const PHONE_REQUEST_ICON_EMOJI_ID = "5406809207947142040";

const phoneRequestKeyboard = Markup.keyboard([
  [colored(Markup.button.contactRequest("Telefon raqamni yuborish"), "success", PHONE_REQUEST_ICON_EMOJI_ID)],
]).resize();

const BOOKING_MESSAGE =
  "🎯 Joyingiz va chegirmangizni fiksatsiya qiling!\n\n" +
  "Chegirma vaucheri va bo'sh o'rinlar soni cheklanganligi sababli, administratorimiz 15 daqiqa ichida siz bilan bog'lanib, dars vaqtlari va sinov darsini belgilaydi.\n\n" +
  "🏢 Bizning manzil: Shams o'quv markazi onlayn\n" +
  "📞 To'g'ridan-to'g'ri aloqa: @Shams_markaz_admin\n" +
  "👨‍💻 Admin: @Shams_markaz_admin";

const ADMIN_CONTACT_URL = "https://t.me/Shams_markaz_admin";

const adminContactLinkKeyboard = Markup.inlineKeyboard([
  [colored(Markup.button.url("💬 Admin bilan bog'lanish", ADMIN_CONTACT_URL), "primary")],
]);

const voucherKeyboard = Markup.inlineKeyboard([
  [colored(Markup.button.callback("👥 Do'stni taklif qilib, yana -20% olish", "invite_friend"), "success")],
  [colored(Markup.button.callback("📞 Sinov darsiga yozilish", "trial_lesson"), "primary")],
  [colored(Markup.button.callback("💳 Joyni band qilish (300 000 so'm)", "reserve_spot"), "success")],
]);

function buildVoucherMessage(fullName: string | null, telegramId: string): string {
  return (
    "🎟 TABRIKLAYMIZ! VAUCHERINGIZ FAQAT SIZ UCHUN TAYYOR BO'LDI!\n" +
    "━━━━━━━━━━━━━━━━━━━\n" +
    `👤 Egasi: ${fullName}\n` +
    `🔢 Vaucher ID: #SHAMS-${telegramId}\n` +
    "💰 Qiymati: 1 000 000 so'mgacha\n" +
    "⏳ Amal qilish muddati: Cheksiz\n" +
    "━━━━━━━━━━━━━━━━━━━\n\n" +
    "📌 Vaucher bilan darslar narxi:\n" +
    "• Yengil tarif (15 dars): 1 700 000 ➔ 1 300 000 so'm\n" +
    "• O'rta tarif (20 dars): 2 300 000 ➔ 1 600 000 so'm\n" +
    "• Katta tarif (25 dars): 2 800 000 ➔ 1 800 000 so'm\n\n" +
    "⚡️ Yana qo'shimcha 20% CHEGIRMA olishni xohlaysizmi?"
  );
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
    await ctx.reply("🎓 Qaysi ta'lim shaklida o'qishni rejalashtiryapsiz?", studyFormKeyboard);
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
    await ctx.reply(TARIFF_SELECTION_MESSAGE, tariffKeyboard);
  });

  bot.action("tariffs_info", async (ctx) => {
    await safeAnswerCbQuery(ctx);
    await ctx.reply(TARIFFS_INFO);
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
    await ctx.reply("🎓 Qaysi ta'lim shaklida o'qishni rejalashtiryapsiz?", studyFormKeyboard);
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
      await ctx.reply(buildConfirmationMessage(updatedUser), confirmationKeyboard);
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
    await ctx.reply(TARIFF_SELECTION_MESSAGE, tariffKeyboard);
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
      try {
        const { issuedAt } = await getOrIssueVoucher(telegramId);
        const referralLink = await getReferralLink(ctx, telegramId);
        const voucherImage = await generateCertificateBuffer(registeredUser.fullName, telegramId, referralLink, issuedAt);

        await withRetry(() => ctx.replyWithPhoto({ source: voucherImage }));

        if (env.adminUsername) {
          const admin = await getUserByUsername(env.adminUsername);

          if (admin && admin.telegramId !== telegramId) {
            let caption = `🔔 Yangi vaucher: ${registeredUser.fullName} (@${registeredUser.username ?? "noma'lum"})`;

            if (registeredUser.referredBy) {
              const referrer = await getUser(registeredUser.referredBy);
              if (referrer?.fullName) {
                caption += `\n👥 ${referrer.fullName} orqali ro'yxatdan o'tdi`;
              }
            }

            try {
              await withRetry(() =>
                ctx.telegram.sendPhoto(
                  admin.telegramId,
                  { source: voucherImage },
                  { caption }
                )
              );
            } catch (err) {
              console.error(`Could not forward voucher to admin @${env.adminUsername}:`, err);
            }
          }
        }
      } catch (err) {
        console.error(`Could not generate/send voucher image for ${telegramId}:`, err);
      }

      await ctx.reply(buildVoucherMessage(registeredUser.fullName, telegramId), voucherKeyboard);
      await notifyReferrerOfNewRegistration(ctx.telegram, registeredUser);
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
    await ctx.reply(BOOKING_MESSAGE, adminContactLinkKeyboard);
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

    await ctx.reply("✅ Telefon raqamingiz qabul qilindi.", Markup.removeKeyboard());
    await ctx.reply("🎂 Necha yoshdasiz?\n\n(masalan: 25)");
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
        await ctx.reply("✅ Telefon raqamingiz qabul qilindi.", Markup.removeKeyboard());
        await ctx.reply("🎂 Necha yoshdasiz?\n\n(masalan: 25)");
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
          await ctx.reply(buildConfirmationMessage(confirmingUser), confirmationKeyboard);
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
        await ctx.reply(`✅ Ma'lumotlaringiz yangilandi. Endi siz ${text} deb qayd etildingiz.`, registeredMenuKeyboard);
        return;
      }

      default:
        return next();
    }
  });
}
