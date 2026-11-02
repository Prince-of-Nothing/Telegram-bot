/**#command
name: /mute
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
  Api.sendMessage({ chat_id: chat.id, text: "⚠️ Please reply to the user you want to mute." });
  return;
}
Api.restrictChatMember({
  chat_id: chat.id,
  user_id: reply.from.id,
  permissions: { can_send_messages: false }
}, function(success) {
  Api.sendMessage({ chat_id: chat.id, text: "🔇 User has been muted." });
});