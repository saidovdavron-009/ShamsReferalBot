import { Markup, Telegraf } from "telegraf";
import { env } from "../../config/env";
import { getUserStats, getUsersByRegistration } from "../users/user.service";
import { User } from "../users/user.entity";
import { safeAnswerCbQuery } from "../../shared/safe-answer-cb-query";
import { colored } from "../../shared/colored-button";

const PAGE_SIZE = 20;

export function isStatsViewer(username: string | null | undefined): boolean {
  return !!username && env.statsViewerUsernames.includes(username.toLowerCase());
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatUser(user: User, index: number): string {
  const name = escapeHtml(user.fullName || "Ism kiritilmagan");
  const link = `<a href="tg://user?id=${user.telegramId}">${name}</a>`;
  const parts = [`${index}. ${link}`];
  if (user.username) parts.push(`@${escapeHtml(user.username)}`);
  if (user.phone) parts.push(escapeHtml(user.phone));
  return parts.join(" — ");
}

async function buildUserList(registered: boolean, page: number) {
  const { users, total } = await getUsersByRegistration(registered, page, PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const title = registered ? "✅ Ro'yxatdan o'tganlar" : "⏳ Ro'yxatdan o'tmaganlar";

  const lines = users.map((u, i) => formatUser(u, page * PAGE_SIZE + i + 1));
  const text =
    `<b>${title}</b> (${total} ta)\n` +
    `Sahifa ${page + 1}/${totalPages}\n\n` +
    (lines.length ? lines.join("\n") : "Hozircha hech kim yo'q");

  const type = registered ? "reg" : "unreg";
  const nav = [];
  if (page > 0) nav.push(Markup.button.callback("⬅️ Oldingi", `users_list:${type}:${page - 1}`));
  if (page + 1 < totalPages) nav.push(Markup.button.callback("Keyingi ➡️", `users_list:${type}:${page + 1}`));

  const keyboard = Markup.inlineKeyboard(nav.length ? [nav] : []);
  return { text, keyboard };
}

export function registerStatsHandler(bot: Telegraf): void {
  bot.action("view_users", async (ctx) => {
    if (!isStatsViewer(ctx.from.username)) {
      await safeAnswerCbQuery(ctx, "⛔ Sizda bu bo'limga ruxsat yo'q");
      return;
    }

    await safeAnswerCbQuery(ctx);

    const { total, registered } = await getUserStats();

    await ctx.reply(
      "👥 Foydalanuvchilar hisoboti\n\n" +
      `Botdagi jami foydalanuvchilar: ${total} ta\n` +
      `✅ Ro'yxatdan o'tganlar: ${registered} ta\n` +
      `⏳ Ro'yxatdan o'tmaganlar: ${total - registered} ta`,
      Markup.inlineKeyboard([
        [
          colored(Markup.button.callback("✅ Ro'yxatdan o'tganlar", "users_open:reg"), "success"),
          colored(Markup.button.callback("⏳ Ro'yxatdan o'tmaganlar", "users_open:unreg"), "danger"),
        ],
      ])
    );
  });

  // Report buttons send a fresh list message; pagination buttons edit it in place.
  bot.action(/^users_(open|list):(reg|unreg)(?::(\d+))?$/, async (ctx) => {
    if (!isStatsViewer(ctx.from.username)) {
      await safeAnswerCbQuery(ctx, "⛔ Sizda bu bo'limga ruxsat yo'q");
      return;
    }

    await safeAnswerCbQuery(ctx);

    const isOpen = ctx.match[1] === "open";
    const registered = ctx.match[2] === "reg";
    const page = Number(ctx.match[3] ?? 0);
    const { text, keyboard } = await buildUserList(registered, page);
    const options = { parse_mode: "HTML" as const, ...keyboard };

    if (isOpen) {
      await ctx.reply(text, options);
    } else {
      await ctx.editMessageText(text, options).catch(() => undefined);
    }
  });
}
