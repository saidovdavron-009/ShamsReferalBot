import { AppDataSource } from "../../config/data-source";
import { BotGroup } from "./group.entity";

const groupRepository = () => AppDataSource.getRepository(BotGroup);

export async function upsertGroup(chatId: string, title: string | null): Promise<void> {
  const repo = groupRepository();
  const existing = await repo.findOne({ where: { chatId } });

  if (existing) {
    await repo.update({ chatId }, { title, isActive: true });
    console.log(`Group/channel re-activated: ${title ?? "(no title)"} (${chatId})`);
    return;
  }

  await repo.save(repo.create({ chatId, title, isActive: true }));
  console.log(`Group/channel registered: ${title ?? "(no title)"} (${chatId})`);
}

export async function deactivateGroup(chatId: string): Promise<void> {
  await groupRepository().update({ chatId }, { isActive: false });
  console.log(`Group/channel deactivated: ${chatId}`);
}

export async function getActiveGroup(): Promise<BotGroup | null> {
  const group = await groupRepository().findOne({ where: { isActive: true }, order: { updatedAt: "DESC" } });
  if (!group) {
    // Silent no-op otherwise: this table is only populated by live my_chat_member/
    // channel_post events, so a fresh/switched database (e.g. moving to a hosted
    // Postgres) starts out empty even though the bot is already an admin somewhere.
    console.warn("No active group/channel registered — re-add the bot as admin (or have it post once) to register it.");
  }
  return group;
}

export async function getActiveGroups(): Promise<BotGroup[]> {
  const groups = await groupRepository().find({ where: { isActive: true }, order: { updatedAt: "DESC" } });
  if (groups.length === 0) {
    console.warn("No active groups/channels registered — re-add the bot as admin (or have it post once) to register it.");
  }
  return groups;
}
