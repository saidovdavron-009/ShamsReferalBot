import { Markup } from "telegraf";
import { colored } from "../../shared/colored-button";

// Temporary: testing a custom emoji icon on this button only, per user request.
const REGISTER_BUTTON_ICON_EMOJI_ID = "5197269100878907942";

export const mainMenuKeyboard = Markup.inlineKeyboard([
  [colored(Markup.button.callback("Ro'yxatdan o'tish", "register_start"), "success", REGISTER_BUTTON_ICON_EMOJI_ID)],
]);

const registeredMenuKeyboard = Markup.inlineKeyboard([
  [colored(Markup.button.callback("🤝 Do'stingizni taklif qiling", "invite_friend"), "success")],
  [colored(Markup.button.callback("📊 Status", "status"), "primary")],
  [colored(Markup.button.callback("✏️ Ism familiyani tahrirlash", "edit_name"), "primary")],
]);
export default registeredMenuKeyboard
