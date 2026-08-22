import { AppDataSource } from "../../config/data-source";
import { BotGroup } from "./group.entity";

const groupRepository = () => AppDataSource.getRepository(BotGroup);

export async function upsertGroup(chatId: string, title: string | null): Promise<void> {
  const repo = groupRepository();
  const existing = await repo.findOne({ where: { chatId } });

  if (existing) {
    await repo.update({ chatId }, { title, isActive: true });
    return;
  }

  await repo.save(repo.create({ chatId, title, isActive: true }));
}

export async function deactivateGroup(chatId: string): Promise<void> {
  await groupRepository().update({ chatId }, { isActive: false });
}

export async function getActiveGroup(): Promise<BotGroup | null> {
  return groupRepository().findOne({ where: { isActive: true }, order: { updatedAt: "DESC" } });
}
