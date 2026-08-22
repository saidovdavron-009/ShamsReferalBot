import { Telegraf } from "telegraf";
import { deactivateGroup, upsertGroup } from "./group.service";

const ACTIVE_STATUSES = new Set(["member", "administrator", "creator"]);
const GROUP_CHAT_TYPES = new Set(["group", "supergroup"]);

export function registerGroupHandler(bot: Telegraf): void {
  bot.on("my_chat_member", async (ctx) => {
    const update = ctx.myChatMember;
    const chat = update.chat;

    if (!GROUP_CHAT_TYPES.has(chat.type)) {
      return;
    }

    const chatId = String(chat.id);
    const title = "title" in chat ? chat.title : null;
    const newStatus = update.new_chat_member.status;

    if (ACTIVE_STATUSES.has(newStatus)) {
      await upsertGroup(chatId, title);
    } else {
      await deactivateGroup(chatId);
    }
  });
}
