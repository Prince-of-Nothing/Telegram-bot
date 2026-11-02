/**#command
name: /unenroll_daily
answer: 
keyboard: 
parse_mode: html
aliases: 
allow_only_group: false
need_reply: false
case_insensitive: true
is_web: 0
#command**/

const chatId = chat.id;
const userId = chat.from.id;

const key = "daily:eligible:" + chatId;

const current = Storage.get(key) || [];
const filtered = current.filter(id => id !== userId);
Storage.set(key, filtered);
Api.sendMessage({
  chat_id: chatId,
  text: "✅ You've been unenrolled from daily picks"
};