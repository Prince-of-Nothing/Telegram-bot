/**#command
name: /done
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
const key = "queue:" + chatId;

let queue = Storage.get(key);
if (!queue || !queue.active || queue.active.length === 0) {
  Api.sendMessage({
    chat_id: chatId,
    text: "No active queue to pop from."
  });
  return;
}

// Pop the first presenter
queue.active.shift();

// Append a new random user if any enrolled remain
const enrolled = queue.enrolled.filter(id => !queue.active.includes(id));
if (enrolled.length > 0) {
  const randomUser = enrolled[Math.floor(Math.random() * enrolled.length)];
  queue.active.push(randomUser);
}

Storage.set(key, queue);

// Present updated queue
const active = queue.active;
if (active.length === 0) {
  Api.sendMessage({
    chat_id: chatId,
    text: `Queue is empty or finished.`
  });
  return;
}

const text = `<b>Queue:</b>\n\n` +
  `Current presenters:\n` +
  active.map((uid, i) => `${i + 1}. User ${uid}`).join("\n") +
  `\n\nUse ✅ Done button to mark finished.`;

if (queue.messageId) {
  Api.editMessageText({
    chat_id: chatId,
    message_id: queue.messageId,
    text: text,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "✅ Done", callback_data: "done" }]]
    }
  });
} else {
  Api.sendMessage({
    chat_id: chatId,
    text: text,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "✅ Done", callback_data: "done" }]]
    }
  });
}