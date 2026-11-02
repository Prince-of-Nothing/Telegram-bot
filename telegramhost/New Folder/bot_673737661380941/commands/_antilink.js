/**#command
name: /antilink
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
let member = Api.getChatMember({ chat_id: chat_id, user_id: request.from.id });

if (!member || (member.status !== "creator" && member.status !== "administrator")) {
  Api.sendMessage({ chat_id: chat_id, text: "⚠️ Only group admins or owners can use this command." });
  return;
}

let params = params ? params.trim().toLowerCase() : "";
if (params !== "on" && params !== "off") {
  let current = Bot.getProperty("antilink_" + chat_id, "off");
  Api.sendMessage({ chat_id: chat_id, text: "🔗 <b>Anti-Link</b> status: <code>" + current.toUpperCase() + "</code>\nUse <code>/antilink on</code> or <code>/antilink off</code> to change.", parse_mode: "HTML" });
  return;
}

Bot.setProperty("antilink_" + chat_id, params, "string");
Api.sendMessage({ chat_id: chat_id, text: "✅ Anti-Link has been turned <b>" + params.toUpperCase() + "</b>.", parse_mode: "HTML" });