/**#command
name: /handle_chat_member
answer: 
keyboard: 
parse_mode: html
aliases: 
allow_only_group: true
need_reply: false
case_insensitive: true
is_web: 0
#command**/

let cm = request;
let chat_id = cm.chat.id;

// Feature 4: Welcome Greeting Manager
let welcomeOn = Bot.getProperty("welcome_" + chat_id, "on");
if (welcomeOn && welcomeOn.toString().toLowerCase() === "on") {
  if (cm.new_chat_members && cm.new_chat_members.length > 0) {
    for (let i = 0; i < cm.new_chat_members.length; i++) {
      let u = cm.new_chat_members[i];
      if (u.is_bot) continue;
      let uid = u.id;
      let mention = `<a href="tg://user?id=${uid}">${u.first_name}</a>`;
      Api.sendMessage({
        chat_id: chat_id,
        text: `🎉 Welcome ${mention} to <b>${cm.chat.title}</b>!\nPlease follow group rules.`,
        parse_mode: "HTML"
      });
    }
  } else if (cm.new_chat_member) {
    let u = cm.new_chat_member.user;
    if (u && !u.is_bot) {
      let uid = u.id;
      let mention = `<a href="tg://user?id=${uid}">${u.first_name}</a>`;
      Api.sendMessage({
        chat_id: chat_id,
        text: `🎉 Welcome ${mention} to <b>${cm.chat.title}</b>!\nPlease follow group rules.`,
        parse_mode: "HTML"
      });
    }
  }
}