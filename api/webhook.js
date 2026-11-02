const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

// --- Redis-backed state helpers ---

const REDIS_PREFIX = "bot:";

async function rGet(key) {
  const { getRedis } = require("./lib/store");
  const redis = getRedis();
  const raw = await redis.get(key);
  return raw ? JSON.parse(raw) : null;
}

async function rSet(key, value, ttlSeconds = null) {
  const { getRedis } = require("./lib/store");
  const redis = getRedis();
  const str = JSON.stringify(value);
  if (ttlSeconds) {
    return redis.setex(key, ttlSeconds, str);
  }
  return redis.set(key, str);
}

async function rDel(key) {
  const { getRedis } = require("./lib/store");
  const redis = getRedis();
  return redis.del(key);
}

// --- Per-group helpers ---

function getChatId(update) {
  return update.message?.chat?.id ?? update.callback_query?.message?.chat?.id;
}

function getUserId(update) {
  return update.message?.from?.id ?? update.callback_query?.from?.id;
}

function getUsername(update) {
  return update.message?.from?.username || update.callback_query?.from?.username || "unknown";
}

/**
 * Check if a user is an administrator of the group/channel.
 * Uses Telegram getChatMember API — works for any group.
 */
async function isChatAdmin(chatId, userId) {
  try {
    const resp = await axios.post(`${API_BASE}/getChatMember`, {
      chat_id: chatId,
      user_id: userId,
    });
    const member = resp.data.result;
    // user.is_member, is_administrator, is_restricted
    return member.is_administrator === true;
  } catch (e) {
    console.error("getChatMember error:", e.message);
    return false;
  }
}

/** Send a message to a chat */
async function sendMessage(chatId, text, parseMode = "HTML", replyMarkup = null) {
  const body = { chat_id: chatId, text, parse_mode: parseMode };
  if (replyMarkup) body.reply_markup = replyMarkup;
  const resp = await axios.post(`${API_BASE}/sendMessage`, body);
  return resp.data;
}

/** Edit an existing message */
async function editMessageText(chatId, messageId, text, replyMarkup = null) {
  const body = { chat_id: chatId, message_id: messageId, text, parse_mode: "HTML" };
  if (replyMarkup) body.reply_markup = replyMarkup;
  await axios.post(`${API_BASE}/editMessageText`, body);
}

/** Answer callback query */
async function answerCallbackQuery(callbackQueryId, text = null) {
  const body = { callback_query_id: callbackQueryId };
  if (text) body.text = text;
  await axios.post(`${API_BASE}/answerCallbackQuery`, body);
}

/** Parse /command args */
function parseCommand(text) {
  if (!text || !text.startsWith("/")) return { command: "", args: [] };
  const parts = text.split(/\s+/);
  return { command: parts[0].toLowerCase(), args: parts.slice(1) };
}

function makeDoneKeyboard() {
  return { inline_keyboard: [[{ text: "✅ Done", callback_data: "done" }]] };
}

function makeRegisterKeyboard(queueName) {
  return {
    inline_keyboard: [[{ text: `📝 Register for ${queueName}`, callback_data: `reg:${queueName}` }]],
  };
}

// --- Redis state keys include chatId so bot works in any group ---

/**
 * Get queue state key: includes chatId so same queue name works per-group
 */
function queueKey(chatId, queueName) {
  return `${REDIS_PREFIX}queue:${chatId}:${queueName}`;
}

/**
 * Get daily eligible key: per-group
 */
function dailyEligibleKey(chatId) {
  return `${REDIS_PREFIX}daily:eligible:${chatId}`;
}

/**
 * Get "picked today" key: per-group per-day
 */
function pickedKey(chatId, type) {
  const today = new Date().toISOString().split("T")[0];
  return `${REDIS_PREFIX}${type}:${chatId}:${today}`;
}

// --- Queue state management ---

async function getQueueState(chatId, queueName) {
  const key = queueKey(chatId, queueName);
  const state = await rGet(key);
  if (!state) {
    return {
      name: queueName,
      chatId,
      createdAt: Date.now(),
      enrolled: [],
      active: [],
      started: false,
      messageId: null,
    };
  }
  return state;
}

async function saveQueueState(chatId, queueName, state) {
  const key = queueKey(chatId, queueName);
  state.chatId = chatId;
  await rSet(key, state);
}

async function deleteQueueFromRedis(chatId, queueName) {
  await rDel(queueKey(chatId, queueName));
}

/**
 * Get all queue names for a specific chat (group)
 */
async function getAllQueueNamesForChat(chatId) {
  const { getRedis } = require("./lib/store");
  const redis = getRedis();
  const pattern = `${REDIS_PREFIX}queue:${chatId}:*`;
  const keys = await redis.keys(pattern);
  return keys.map(k => k.replace(`${REDIS_PREFIX}queue:${chatId}:`, ""));
}

// --- Daily picks per-group ---

async function getDailyEligible(chatId) {
  const key = dailyEligibleKey(chatId);
  const arr = await rGet(key);
  return arr || [];
}

async function addDailyEligible(chatId, userId) {
  const key = dailyEligibleKey(chatId);
  const arr = await getDailyEligible(chatId);
  if (!arr.includes(userId)) {
    arr.push(userId);
    await rSet(key, arr);
  }
}

async function removeDailyEligible(chatId, userId) {
  const key = dailyEligibleKey(chatId);
  const arr = await getDailyEligible(chatId);
  const filtered = arr.filter(id => id !== userId);
  await rSet(key, filtered);
}

async function alreadyPickedToday(chatId, type) {
  const key = pickedKey(chatId, type);
  const val = await rGet(key);
  return val !== null;
}

async function setPickedToday(chatId, type, userId) {
  const key = pickedKey(chatId, type);
  await rSet(key, userId, 86400 * 3); // 3 days
}

// --- Webhook handler ---

app.post("/webhook", async (req, res) => {
  const update = req.body;

  try {
    if (update.callback_query) {
      const cb = update.callback_query;
      const msg = cb.message;
      const chatId = msg.chat.id;
      const messageId = msg.message_id;
      const data = cb.data;
      const userId = cb.from.id;

      await answerCallbackQuery(cb.id);

      if (data.startsWith("reg:")) {
        const queueName = data.slice(4);
        const state = await getQueueState(chatId, queueName);
        if (!state.enrolled.includes(userId)) {
          state.enrolled.push(userId);
          await saveQueueState(chatId, queueName, state);
        }
        await sendMessage(
          chatId,
          `✅ Registered for "<b>${queueName}</b>" queue!`,
          "HTML"
        );
        if (state.started && state.active.length > 0) {
          await presentQueue(chatId, queueName, await getQueueState(chatId, queueName));
        }
      } else if (data === "done") {
        // Find which queue this user is in
        const queues = await getAllQueueNamesForChat(chatId);
        let handled = false;
        for (const q of queues) {
          const state = await getQueueState(chatId, q);
          if (state.active.includes(userId)) {
            state.enrolled = state.enrolled.filter(id => id !== userId);
            state.active = state.active.filter(id => id !== userId);
            await popAndAppendQueue(chatId, q);
            await saveQueueState(chatId, q, state);
            await presentQueue(chatId, q, await getQueueState(chatId, q));
            handled = true;
            break;
          }
        }
        if (!handled) {
          await sendMessage(chatId, "You're not currently in any active queue.");
        }
      } else if (data.startsWith("start:")) {
        const queueName = data.slice(6);
        const state = await getQueueState(chatId, queueName);
        state.started = true;
        await pickNextThreeQueue(chatId, queueName);
        await saveQueueState(chatId, queueName, state);
      }

      res.sendStatus(200);
      return;
    }

    if (update.message && update.message.text) {
      const chatId = getChatId(update);
      const userId = getUserId(update);
      const text = update.message.text;
      const { command, args } = parseCommand(text);

      // --- Daily picks commands ---

      if (command === "/pidor") {
        await handleDailyPick(chatId, "pidor");
      } else if (command === "/beauty") {
        await handleDailyPick(chatId, "beauty");
      } else if (command === "/daily_pidor") {
        // Check if admin dynamically
        const admin = await isChatAdmin(chatId, userId);
        if (!admin) {
          await sendMessage(chatId, "❌ Admin only.");
        } else {
          await handleDailyPick(chatId, "pidor");
        }
      } else if (command === "/daily_beauty") {
        const admin = await isChatAdmin(chatId, userId);
        if (!admin) {
          await sendMessage(chatId, "❌ Admin only.");
        } else {
          await handleDailyPick(chatId, "beauty");
        }
      } else if (command === "/enroll_daily") {
        await addDailyEligible(chatId, userId);
        await sendMessage(chatId, "✅ You're enrolled in daily picks!");
      } else if (command === "/unenroll_daily") {
        await removeDailyEligible(chatId, userId);
        await sendMessage(chatId, "✅ Removed from daily picks.");
      }

      // --- Queue commands ---

      else if (command === "/queue") {
        if (args.length === 0) {
          // List queues for THIS chat only
          const queues = await getAllQueueNamesForChat(chatId);
          if (queues.length === 0) {
            await sendMessage(
              chatId,
              "No queues exist yet. Use /queue start <name> to create one."
            );
          } else {
            await sendMessage(
              chatId,
              `Existing queues:\n${queues.map((q, i) => `${i + 1}. ${q}`).join("\n")}\nUse /queue start <name> to start one.`,
              "HTML"
            );
          }
        } else if (args[0] === "start") {
          // /queue start <name>
          if (!args[1]) {
            await sendMessage(chatId, "Usage: /queue start <name>");
          } else {
            const queueName = args[1];
            const state = await getQueueState(chatId, queueName);
            state.started = true;
            await pickNextThreeQueue(chatId, queueName);
            await saveQueueState(chatId, queueName, state);
          }
        } else if (args[0] === "delete") {
          // /queue delete <name>
          if (!args[1]) {
            await sendMessage(chatId, "Usage: /queue delete <name>");
          } else {
            const queueName = args[1];
            await deleteQueueFromRedis(chatId, queueName);
            await sendMessage(chatId, `🗑️ Queue "${queueName}" deleted.`);
          }
        } else {
          // /queue <name> - create if not exists
          const queueName = args[0];
          const state = await getQueueState(chatId, queueName);
          if (!state.name) {
            state.name = queueName;
            state.chatId = chatId;
            await saveQueueState(chatId, queueName, state);
          }
          await sendMessage(
            chatId,
            `Queue "<b>${queueName}</b>" created/selected. Use the button below to register.`,
            "HTML",
            makeRegisterKeyboard(queueName)
          );
        }
      } else if (command === "/done") {
        // Mark yourself done in any active queue
        const queues = await getAllQueueNamesForChat(chatId);
        let handled = false;
        for (const q of queues) {
          const state = await getQueueState(chatId, q);
          if (state.active.includes(userId)) {
            state.enrolled = state.enrolled.filter(id => id !== userId);
            state.active = state.active.filter(id => id !== userId);
            await popAndAppendQueue(chatId, q);
            await saveQueueState(chatId, q, state);
            await presentQueue(chatId, q, await getQueueState(chatId, q));
            handled = true;
            break;
          }
        }
        if (!handled) {
          await sendMessage(chatId, "You're not currently in any active queue.");
        }
      }
    }
  } catch (err) {
    console.error("Webhook error:", err);
    try {
      const chatId = update.message?.chat?.id;
      if (chatId) {
        await sendMessage(chatId, "❌ An error occurred. Please try again.");
      }
    } catch (_) {}
  }

  res.sendStatus(200);
});

/**
 * Pick next 3 for a queue
 */
async function pickNextThreeQueue(chatId, queueName) {
  const state = await getQueueState(chatId, queueName);
  const eligible = state.enrolled.filter(id => !state.active.includes(id));

  if (eligible.length < 3) {
    await sendMessage(
      chatId,
      `⚠️ Need at least 3 enrolled users for "${queueName}". Only ${eligible.length} registered.`
    );
    return;
  }

  const shuffled = eligible.sort(() => 0.5 - Math.random());
  const three = shuffled.slice(0, 3);
  state.active = three;
  await saveQueueState(chatId, queueName, state);
  await presentQueue(chatId, queueName, state);
}

/**
 * Pop first and append new random
 */
async function popAndAppendQueue(chatId, queueName) {
  const state = await getQueueState(chatId, queueName);
  if (state.active.length === 0) return;

  // Pop first
  state.active.shift();

  // Append new random if available
  const enrolled = state.enrolled.filter(id => !state.active.includes(id));
  if (enrolled.length > 0) {
    const random = enrolled[Math.floor(Math.random() * enrolled.length)];
    state.active.push(random);
  }

  await saveQueueState(chatId, queueName, state);
}

/**
 * Present the current queue state with Done button
 */
async function presentQueue(chatId, queueName, state) {
  const active = state.active;
  if (!active || active.length === 0) {
    await sendMessage(chatId, `Queue "${queueName}" is empty or finished.`);
    return;
  }

  const text = `
<b>Queue: ${queueName}</b>
Current presenters:
${active.map((uid, i) => `${i + 1}. <a href="tg://user?id">${uid}</a>`).join("\n")}
  `.trim();

  if (state.messageId) {
    try {
      await editMessageText(chatId, state.messageId, text, makeDoneKeyboard());
    } catch (_) {
      const msg = await sendMessage(chatId, text, "HTML", makeDoneKeyboard());
      state.messageId = msg.message_id;
      await saveQueueState(chatId, queueName, state);
    }
  } else {
    const msg = await sendMessage(chatId, text, "HTML", makeDoneKeyboard());
    state.messageId = msg.message_id;
    await saveQueueState(chatId, queueName, state);
  }
}

// Auto-delete: queues older than 48h that were never started
async function cleanupOldQueues() {
  const queues = await getAllQueueNamesForChat(chatId); // Note: need chatId here too
  const now = Date.now();
  const twoDays = 48 * 60 * 60 * 1000;
  for (const q of queues) {
    const state = await getQueueState(chatId, q);
    if (!state.started && now - state.createdAt > twoDays) {
      await deleteQueueFromRedis(chatId, q);
    }
  }
}

// Root route
app.get("/", (req, res) => res.send("Bot is running"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bot listening on port ${PORT}`);
});

module.exports = app;