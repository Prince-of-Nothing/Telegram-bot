/**#command
name: /ban
answer: 
keyboard: 
parse_mode: html
aliases: 
allow_only_group: true
need_reply: true
case_insensitive: true
is_web: 0
#command**/

let reply = message.reply_to_message;
if (!reply) {
  Api.sendMessage({ chat_id: chat.id, text: "⚠️ Please reply to the user you want to ban." });
  return;
}
Api.banChatMember({
  chat_id: chat.id,
  user_id: reply.from.id
}, function(success, result) {
  if (success) {
    Api.sendMessage({ chat_id: chat.id, text: "✅ User <b>" + (reply.from.first_name || "User")#[0] + "</b> has been banned.", parse_mode: "HTML" });
  } else {
    Api.sendMessage({ chat_id: chat.id, text: "❌ Failed to ban user. Make sure I am an admin with ban permissions." });
  }
});