/**#command
name: /enroll_daily
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
if (!current.includes(userId)) {
  current.push(userId);
  Storage.set(key, current);
  Api.sendMessage({
    chat_id: chatId,
    text: "✅ You're now enrolled in daily picks! Use /pidor or /beauty to see your chance"
  }
};