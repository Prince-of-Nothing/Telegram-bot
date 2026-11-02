/**#command
name: /debug
answer: 
keyboard: 
parse_mode: html
aliases: 
allow_only_group: false
need_reply: false
case_insensitive: true
is_web: 0
#command**/
let chat_id = chat.id;

let member = Api.getChatMember({ chat_id: chat_id, user_id: request.from.id });
let is_admin = member && (member.status === "creator" || member.status === "administrator");

if (!is_admin) {
  Api.sendMessage({ chat_id: chat_id, text: "⚠️ Admin only." });
  return;
}

let info = "🔍 <b>Bot Debug Info</b>\n\n";
info += "• Bot ID: " + bot_id + "\n";
info += "• Chat ID: " + chat_id + "\n";
info += "• User ID: " + request.from.id + "\n";
info += "• Is Admin: " + is_admin + "\n";
info += "• Time: " + new Date().toISOString() + "\n\n";

let eligible = Storage.get("daily:eligible:" + chat_id);
info += "• Daily Eligible Users: " + (eligible ? eligible.length : 0) + "\n";

let pidorToday = Storage.get("pidor:" + new Date().toISOString().split("T")[0]);
let beautyToday = Storage.get("beauty:" + new Date().toISOString().split("T")[0]);
info += "• Pidor Today: " + (pidorToday ? pidorToday : "Not picked") + "\n";
info += "• Beauty Today: " + (beautyToday ? beautyToday : "Not picked") + "\n";

let queue = Storage.get("queue:" + chat_id);
if (queue) {
  info += "• Queue: " + queue.name + "\n";
  info += "• Enrolled: " + (queue.enrolled ? queue.enrolled.length : 0) + "\n";
  info += "• Active: " + (queue.active ? queue.active.length : 0) + "\n";
  info += "• Started: " + (queue.started ? "Yes" : "No") + "\n";
} else {
  info += "• Queue: None\n";
}

Api.sendMessage({ chat_id: chat_id, text: info, parse_mode: "HTML" });