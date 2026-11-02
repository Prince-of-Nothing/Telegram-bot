/**#command
name: /unmute
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
  Api.sendMessage({ chat_id: chat.id, text: "⚠️ Please reply to the user you want to unmute." });
  return;
}
Api.restrictChatMember({
  chat_id: chat.id,
  user_id: reply.from.id,
  permissions: {
    can_send_messages: true,
    can_send_media_messages: true,
    can_send_other_messages: true,
    can_add_web_page_previews: true
  }
}, function(success) {
  Api.sendMessage({ chat_id: chat.id, text: "🔊 User has been unmuted." });
});