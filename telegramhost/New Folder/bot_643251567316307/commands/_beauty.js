/**#command
name: /beauty
answer: 
keyboard: 
parse_mode: html
aliases: 
allow_only_group: false
need_reply: false
case_insensitive: true
is_web: 0
#command**/

const today = new Date().toISOString().split("T")[0];
const key = "beauty:" + today;

const existing = Storage.get(key);
if (existing) {
  Api.sendMessage({
    chat_id: chat.id,
    text: "Beauty of the day was already picked today! It was: @" + existing,
    parse_mode: "HTML"
  });
  return;
}

const eligible = Storage.get("daily:eligible") || [];
if (!eligible || eligible.length === 0) {
  Api.sendMessage({
    chat_id: chat.id,
    text: "No one is enrolled for Beauty of the day yet. Ask someone to use /enroll_daily"
  });
  return;
}

// Suspense messages
const suspense = [
  "Выясним, кто тут главный пидор 😏",
  "Проверим, все ли пишут тесты 🤔",
  "Смотрим наличие костылей в коде 🩼",
  "Ищем, у кого есть кружка Peder 🍺",
  "Изучаем фото с ЛГБТ-митингов 🌈"
];

let i = 0;
function sendNextSuspense() {
  if (i < suspense.length) {
    Api.sendMessage({ chat_id: chat.id, text: suspense[i] });
    i++;
    setTimeout(sendNextSuspense, 1500);
  } else {
    const chosen = eligible[Math.floor(Math.random() * eligible.length)];
    Storage.set(key, chosen, 86400 * 3);
    Api.sendMessage({
      chat_id: chat.id,
      text: "Beauty of the day: @" + chosen,
      parse_mode: "HTML"
    });
  }
}

sendNextSuspense();