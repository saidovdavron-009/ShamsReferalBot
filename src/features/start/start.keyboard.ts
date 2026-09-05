import { Markup } from "telegraf";
import { colored } from "../../shared/colored-button";

// Temporary: testing a custom emoji icon on this button only, per user request.
const REGISTER_BUTTON_ICON_EMOJI_ID = "5197269100878907942";
const INVITE_FRIEND_BUTTON_ICON_EMOJI_ID = "5782917763186037361";
const STATUS_BUTTON_ICON_EMOJI_ID = "5334543204916146110";
const EDIT_NAME_BUTTON_ICON_EMOJI_ID = "5370951118698339120";

export const mainMenuKeyboard = Markup.inlineKeyboard([
  [colored(Markup.button.callback("Ro'yxatdan o'tish", "register_start"), "success", REGISTER_BUTTON_ICON_EMOJI_ID)],
]);

const registeredMenuKeyboard = Markup.inlineKeyboard([
  [colored(Markup.button.callback("Yaqiningizni taklif qiling", "invite_friend"), "success", INVITE_FRIEND_BUTTON_ICON_EMOJI_ID)],
  [colored(Markup.button.callback("Status", "status"), "primary", STATUS_BUTTON_ICON_EMOJI_ID)],
  [colored(Markup.button.callback("Ism familiyani tahrirlash", "edit_name"), "primary", EDIT_NAME_BUTTON_ICON_EMOJI_ID)],
]);
export default registeredMenuKeyboard
