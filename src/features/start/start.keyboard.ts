import { Markup } from "telegraf";

export const mainMenuKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback("🤝 Do'stingizni taklif qiling", "invite_friend")],
  [Markup.button.callback("📝 Ro'yxatdan o'tish", "register_start")],
]);

const registeredMenuKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback("🤝 Do'stingizni taklif qiling", "invite_friend")],
  [Markup.button.callback("✏️ Ism familiyani tahrirlash", "edit_name")],
]);
export default registeredMenuKeyboard
