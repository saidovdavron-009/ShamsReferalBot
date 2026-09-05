import { Telegraf } from "telegraf";
import { deactivateGroup, upsertGroup } from "./group.service";

const ACTIVE_STATUSES = new Set(["member", "administrator", "creator"]);
// Groups/supergroups AND channels — the bot broadcasts vouchers to any chat
// it's added to and kept active in, not just group chats.
const TARGET_CHAT_TYPES = new Set(["group", "supergroup", "channel"]);

export function registerGroupHandler(bot: Telegraf): void {
  bot.on("my_chat_member", async (ctx) => {
    const update = ctx.myChatMember;
    const chat = update.chat;

    if (!TARGET_CHAT_TYPES.has(chat.type)) {
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

  // Fallback registration path: my_chat_member only fires on the moment the
  // bot's status changes, and bot.launch({ dropPendingUpdates: true }) throws
  // away any such event that happened while the bot wasn't running the
  // updated code (e.g. a channel the bot was already made admin of before
  // this feature shipped). Any post the bot sees in a channel it's admin of
  // re-registers that channel too, so posting once is enough to pick it up.
  bot.on("channel_post", async (ctx) => {
    const chat = ctx.channelPost.chat;
    const chatId = String(chat.id);
    const title = "title" in chat ? chat.title : null;

    await upsertGroup(chatId, title);
  });
}
