/**#command
name: /help
answer: 
keyboard: 
parse_mode: html
aliases: 
allow_only_group: false
need_reply: false
case_insensitive: true
is_web: 0
#command**/

Api.sendMessage({
  chat_id: chat.id,
  text: `<b>Bot Commands</b>

<b>Daily Picks:</b>
/pidor — Pick Pidor of the day (once/day)
/beauty — Pick Beauty of the day (once/day)
/enroll_daily — Enroll in daily picks
/unenroll_daily — Remove from daily picks

<b>Presentation Queue:</b>
/queue <name> — Create/select queue
/queue start <name> — Start queue (3 people)
/queue delete <name> — Delete queue
/done — Mark yourself done (pop, shift, append new)

<b>Admin Commands:</b>
/daily_pidor — Force daily pidor pick (admin only)
/daily_beauty — Force daily beauty pick (admin only)

<b>Other:</b>
/help — Show this message`
}, { parse_mode: "HTML" });
