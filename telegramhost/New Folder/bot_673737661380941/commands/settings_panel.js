/**#command
name: settings_panel
answer: 
keyboard: 
parse_mode: html
aliases: 
allow_only_group: true
need_reply: false
case_insensitive: true
is_web: 0
#command**/

let chat_id = chat.id;
let userId = request.from.id;

// Strict Admin & Owner Check
let isAdmin = false;
try {
  let member = await Api.getChatMember({ chat_id: chat_id, user_id: userId });
  let status = member && (member.status || (member.result && member.result.status));
  if (status === "creator" || status === "administrator") { 
    isAdmin = true; 
  }
} catch(e) {}

if (!isAdmin) {
  try {
    Api.answerCallbackQuery({
      callback_query_id: request.id,
      text: "⚠️ Only admins can change group settings!",
      show_alert: true
    });
  } catch(e) {}
  return;
}

let data = params || "";

if (data.startsWith("toggle_")) {
  let moduleName = data.replace("toggle_", "");
  let propKey = moduleName + "_" + chat_id;
  let current = Bot.getProperty(propKey, moduleName === "welcome" ? "on" : "off");
  let next = (current && current.toString().toLowerCase() === "on") ? "off" : "on";
  Bot.setProperty(propKey, next, "string");
}

let linkVal = Bot.getProperty("antilink_" + chat_id, "off");
let linkStatus = (linkVal && linkVal.toString().toUpperCase() === "ON") ? "🟢 ON" : "🔴 OFF";

let fwdVal = Bot.getProperty("antiforward_" + chat_id, "off");
let fwdStatus = (fwdVal && fwdVal.toString().toUpperCase() === "ON") ? "🟢 ON" : "🔴 OFF";

let nsfwVal = Bot.getProperty("antisns_" + chat_id, "off");
let nsfwStatus = (nsfwVal && nsfwVal.toString().toUpperCase() === "ON") ? "🟢 ON" : "🔴 OFF";

let welcomeVal = Bot.getProperty("welcome_" + chat_id, "on");
let welcomeStatus = (welcomeVal && welcomeVal.toString().toUpperCase() === "ON") ? "🟢 ON" : "🔴 OFF";

let raidVal = Bot.getProperty("antiraid_" + chat_id, "off");
let raidStatus = (raidVal && raidVal.toString().toUpperCase() === "ON") ? "🟢 ON" : "🔴 OFF";

let ik = [
  [{ text: "🔗 Anti-Link: " + linkStatus, callback_data: "settings_panel toggle_antilink" }],
  [{ text: "↗️ Anti-Forward: " + fwdStatus, callback_data: "settings_panel toggle_antiforward" }],
  [{ text: "🔞 Anti-NSFW: " + nsfwStatus, callback_data: "settings_panel toggle_antisns" }],
  [{ text: "👋 Welcome Msg: " + welcomeStatus, callback_data: "settings_panel toggle_welcome" }],
  [{ text: "🛡️ Anti-Raid Mode: " + raidStatus, callback_data: "settings_panel toggle_antiraid" }],
  [{ text: "🔄 Refresh Panel", callback_data: "settings_panel refresh" }]
];

if (request.message) {
  try {
    Api.editMessageText({
      chat_id: chat_id,
      message_id: request.message.message_id,
      text: "⚙️ <b>Advanced Group Security & Management Panel</b>\n\nManage modules below:",
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: ik }
    });
  } catch(e) {}
}

try {
  Api.answerCallbackQuery({
    callback_query_id: request.id,
    text: "Settings updated!",
    show_alert: false
  });
} catch(e) {}