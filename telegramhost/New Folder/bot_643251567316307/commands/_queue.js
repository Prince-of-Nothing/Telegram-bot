/**#command
name: /queue
answer: 
keyboard: 
parse_mode: html
aliases: 
allow_only_group: false
need_reply: false
case_insensitive: true
is_web: 0
#command**/

// Create/select queue using memory storage
// Storage is per-bot-session, resets on restart

const name = "Lab"; // default, or parse args if needed
const key = "queue:" + chat.id;

let queue = Storage.get(key) || { name: name, enrolled: [], active: [], messageId: null };

// If not started, just show register button
if (!queue.started) {
  Api.sendMessage({
    chat_id: chat.id,
    text: `<b>Queue:</b> <u>${name}</u>\n\n` +
      `Use the button below to register. ${queue.enrolled.length} currently registered.\n\n` +
      `Click "📝 Register for Lab" to join the queue.`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "📝 Register for Lab", callback_data: "reg:Lab" }]]
    }
  });
} else {
  // Show active queue
  const active = queue.active || [];
  const text = `<b>Queue:</b> <u>${name}</u>\n\n` +
    `Current presenters (in order):\n` +
    active.map((uid, i) => `${i + 1}. User ${i + 1}`).join("\n") +
    `\n\nUse ✅ Done button to mark finished.`;
  
  if (queue.messageId) {
    // Edit existing message
    Api.editMessageText({
      chat_id: chat.id,
      message_id: queue.messageId,
      text: text,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "✅ Done", callback_data: "done" }]]
      }
    });
  } else {
    // Send new message
    const msg = await Api.sendMessage({
      chat_id: chat.id,
      text: text,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "✅ Done", callback_data: "done" }]]
      }
    });
    // Update storage with new message id
    queue.messageId = msg.message_id;
    Storage.set(key, queue);
  }
}