export type ButtonStyle = "primary" | "success" | "danger";

// Bot API 9.4 added `style` (button color) and `icon_custom_emoji_id` fields
// to keyboard buttons; neither is in the installed @telegraf/types yet, so
// this helper adds them with a single cast instead of repeating
// `as unknown as ...` at every call site. Telegram itself accepts and
// renders these fields regardless of what the (outdated) TypeScript types
// know about.
//
// Note: icon_custom_emoji_id only renders if the bot owner has Telegram
// Premium, or the bot purchased extra usernames via Fragment — otherwise
// Telegram rejects the whole sendMessage/editMessageText call.
export function colored<T extends object>(button: T, style: ButtonStyle, iconCustomEmojiId?: string): T {
  return {
    ...button,
    style,
    ...(iconCustomEmojiId ? { icon_custom_emoji_id: iconCustomEmojiId } : {}),
  } as T;
}
