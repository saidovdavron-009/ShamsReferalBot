import { AppDataSource } from "../../config/data-source";
import { User } from "./user.entity";

const userRepository = () => AppDataSource.getRepository(User);

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

export async function setAwaitingRegistration(telegramId: string, awaiting: boolean): Promise<void> {
  await userRepository().update({ telegramId }, { awaitingRegistration: awaiting });
}

export async function completeRegistration(telegramId: string, fullName: string): Promise<void> {
  await userRepository().update(
    { telegramId },
    { fullName, isRegistered: true, awaitingRegistration: false }
  );
}

export async function getUser(telegramId: string): Promise<User | null> {
  return userRepository().findOne({ where: { telegramId } });
}

export async function countReferrals(telegramId: string): Promise<number> {
  return userRepository().count({ where: { referredBy: telegramId } });
}
