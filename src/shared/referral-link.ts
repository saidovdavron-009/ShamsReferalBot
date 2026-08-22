import { Context } from "telegraf";

export async function getReferralLink(ctx: Context, telegramId: string): Promise<string> {
  const botUsername = ctx.botInfo?.username ?? (await ctx.telegram.getMe()).username;
  return `https://t.me/${botUsername}?start=ref_${telegramId}`;
}
