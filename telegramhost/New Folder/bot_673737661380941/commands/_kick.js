/**#command
name: /kick
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
  Api.sendMessage({ chat_id: chat.id, text: "⚠️ Please reply to the user you want to kick." });
  return;
}
Api.banChatMember({
  chat_id: chat.id,
  user_id: reply.from.id
}, function(success) {
  Api.unbanChatMember({
    chat_id: chat.id,
    user_id: reply.from.id
  });
  Api.sendMessage({ chat_id: chat.id, text: "👢 User has been kicked from the group." });
});