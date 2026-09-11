import { randomInt } from "crypto";
import { IsNull, LessThanOrEqual } from "typeorm";
import { AppDataSource } from "../../config/data-source";
import { User } from "./user.entity";

const userRepository = () => AppDataSource.getRepository(User);

const VOUCHER_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const VOUCHER_LENGTH = 10;

function generateVoucherCode(): string {
  let code = "";
  for (let i = 0; i < VOUCHER_LENGTH; i++) {
    code += VOUCHER_CHARS[randomInt(VOUCHER_CHARS.length)];
  }
  return code;
}

export async function findOrCreateUser(
  telegramId: string,
  username: string | null,
  referredBy: string | null
): Promise<User> {
  const repo = userRepository();
  let user = await repo.findOne({ where: { telegramId } });

  if (!user) {
    user = repo.create({
      telegramId,
      username,
      referredBy: referredBy && referredBy !== telegramId ? referredBy : null,
    });
    await repo.save(user);
  }

  return user;
}

export async function setRegistrationStep(telegramId: string, step: string | null): Promise<void> {
  await userRepository().update({ telegramId }, { registrationStep: step });
}

export async function updateFullName(telegramId: string, fullName: string): Promise<void> {
  await userRepository().update({ telegramId }, { fullName });
}

export async function updateAge(telegramId: string, age: number): Promise<void> {
  await userRepository().update({ telegramId }, { age });
}

export async function updatePhone(telegramId: string, phone: string): Promise<void> {
  await userRepository().update({ telegramId }, { phone });
}

export async function updateArabicLevel(telegramId: string, arabicLevel: string): Promise<void> {
  await userRepository().update({ telegramId }, { arabicLevel });
}

async function updateGender(telegramId: string, gender: string): Promise<void> {
  await userRepository().update({ telegramId }, { gender });
}

export default updateGender

export async function updateStudyForm(telegramId: string, studyForm: string): Promise<void> {
  await userRepository().update({ telegramId }, { studyForm });
}

export async function updateTariff(telegramId: string, tariff: string): Promise<void> {
  await userRepository().update({ telegramId }, { tariff });
}

export async function completeRegistration(telegramId: string): Promise<void> {
  await userRepository().update(
    { telegramId },
    { isRegistered: true, registrationStep: null }
  );
}

export async function getUser(telegramId: string): Promise<User | null> {
  return userRepository().findOne({ where: { telegramId } });
}

export async function getUserByUsername(username: string): Promise<User | null> {
  return userRepository().findOne({ where: { username } });
}

export async function countReferrals(telegramId: string): Promise<number> {
  return userRepository().count({ where: { referredBy: telegramId } });
}

export async function getReferrals(telegramId: string): Promise<User[]> {
  return userRepository().find({
    where: { referredBy: telegramId },
    order: { createdAt: "ASC" },
  });
}

export async function getOrIssueVoucher(
  telegramId: string
): Promise<{ voucherCode: string; issuedAt: Date }> {
  const repo = userRepository();
  const user = await repo.findOneOrFail({ where: { telegramId } });

  if (user.voucherCode && user.certificateIssuedAt) {
    return { voucherCode: user.voucherCode, issuedAt: user.certificateIssuedAt };
  }

  let voucherCode: string;
  for (;;) {
    voucherCode = generateVoucherCode();
    const existing = await repo.findOne({ where: { voucherCode } });
    if (!existing) break;
  }

  const issuedAt = new Date();
  await repo.update({ telegramId }, { voucherCode, certificateIssuedAt: issuedAt });
  return { voucherCode, issuedAt };
}

export async function markBookingRequested(telegramId: string): Promise<void> {
  const repo = userRepository();
  const user = await repo.findOne({ where: { telegramId } });

  if (user && !user.bookingRequestedAt) {
    await repo.update({ telegramId }, { bookingRequestedAt: new Date() });
  }
}

export async function markAdminContactRequested(telegramId: string): Promise<void> {
  const repo = userRepository();
  const user = await repo.findOne({ where: { telegramId } });

  if (user && !user.adminContactRequestedAt) {
    await repo.update({ telegramId }, { adminContactRequestedAt: new Date() });
  }
}

export async function setCourseEnrolled(telegramId: string, enrolled: boolean): Promise<void> {
  await userRepository().update({ telegramId }, { courseEnrolled: enrolled });
}

const ENROLLMENT_CONFIRM_FIRST_DELAY_MS = 3 * 60 * 1000;
const ENROLLMENT_CONFIRM_REPEAT_DELAY_MS = 10 * 60 * 1000;

// Due for a ping either 3 minutes after first contacting admin (never pinged
// yet) or every 10 minutes after that (already pinged, still unanswered).
// Once the admin presses Ha/Yo'q, courseEnrolled stops being null and the
// user drops out of both branches.
export async function findUsersDueForEnrollmentConfirmation(): Promise<User[]> {
  const firstThreshold = new Date(Date.now() - ENROLLMENT_CONFIRM_FIRST_DELAY_MS);
  const repeatThreshold = new Date(Date.now() - ENROLLMENT_CONFIRM_REPEAT_DELAY_MS);

  return userRepository().find({
    where: [
      {
        courseEnrolled: IsNull(),
        adminContactRequestedAt: LessThanOrEqual(firstThreshold),
        enrollmentConfirmLastSentAt: IsNull(),
      },
      {
        courseEnrolled: IsNull(),
        enrollmentConfirmLastSentAt: LessThanOrEqual(repeatThreshold),
      },
    ],
  });
}

export async function markEnrollmentConfirmationSent(telegramId: string): Promise<void> {
  await userRepository().update({ telegramId }, { enrollmentConfirmLastSentAt: new Date() });
}

export async function findUsersDueFor24hReminder(): Promise<User[]> {
  const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return userRepository().find({
    where: {
      certificateIssuedAt: LessThanOrEqual(threshold),
      adminContactRequestedAt: IsNull(),
      reminder24hSentAt: IsNull(),
    },
  });
}

export async function findUsersDueFor40hReminder(): Promise<User[]> {
  const threshold = new Date(Date.now() - 40 * 60 * 60 * 1000);
  return userRepository().find({
    where: {
      certificateIssuedAt: LessThanOrEqual(threshold),
      adminContactRequestedAt: IsNull(),
      reminder40hSentAt: IsNull(),
    },
  });
}

export async function markReminder24hSent(telegramId: string): Promise<void> {
  await userRepository().update({ telegramId }, { reminder24hSentAt: new Date() });
}

export async function markReminder40hSent(telegramId: string): Promise<void> {
  await userRepository().update({ telegramId }, { reminder40hSentAt: new Date() });
}
