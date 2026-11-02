/**#command
name: *
answer: 
keyboard: 
parse_mode: html
aliases: 
allow_only_group: true
need_reply: false
case_insensitive: false
is_web: 0
#command**/

// Global Message Interceptor / Filter Check
let msg = request;
if (!msg || chat.chat_type === "private") { return; }

let chat_id = chat.id;
let userObj = msg.from;
if (!userObj) { return; }

let userId = userObj.id;
let firstName = userObj.first_name || "User";

// 1. Foolproof Admin & Owner Check using await Api.getChatMember
let isAdmin = false;
try {
  let member = await Api.getChatMember({ chat_id: chat_id, user_id: userId });
  let status = "";
  if (member) {
    if (member.status) { status = member.status; }
    else if (member.result && member.result.status) { status = member.result.status; }
  }
  
  if (status === "creator" || status === "administrator") {
    isAdmin = true;
  }
} catch (e) {}

if (isAdmin) {
  return;
}

// Feature 12: Service Message Cleaner (Clean join/left notifications)
if (msg.new_chat_members || msg.left_chat_member || msg.new_chat_member) {
  try {
    Api.deleteMessage({ chat_id: chat_id, message_id: msg.message_id });
  } catch(e) {}
  return;
}

// Feature 11: Anti-Spam / Anti-Flood Detector (4 messages in 5 seconds -> 1 min mute)
let spamKey = "spam_" + chat_id + "_" + userId;
let now = Math.floor(Date.now() / 1000);
let timestamps = Bot.getProperty(spamKey, []);
if (!Array.isArray(timestamps)) { timestamps = []; }
timestamps = timestamps.filter(t => (now - t) <= 5);
timestamps.push(now);
Bot.setProperty(spamKey, timestamps, "json");

if (timestamps.length >= 4) {
  try {
    Api.deleteMessage({ chat_id: chat_id, message_id: msg.message_id });
    await Api.restrictChatMember({
      chat_id: chat_id,
      user_id: userId,
      until_date: now + 60,
      permissions: { can_send_messages: false, can_send_media_messages: false }
    });
    Api.sendMessage({
      chat_id: chat_id,
      receiver_user_id: userId,
      text: `${firstName}, please stop flooding! You have been muted for 1 minute.`,
      parse_mode: "HTML"
    });
  } catch(e) {}
  Bot.setProperty(spamKey, [], "json");
  return;
}

let text = msg.text || msg.caption || "";
let entities = msg.entities || msg.caption_entities || [];

// Feature 5: Anti-Raid / Lockdown Mode Check
let antiraid = Bot.getProperty("antiraid_" + chat_id, "off");
if (antiraid === "on") {
  try {
    Api.deleteMessage({ chat_id: chat_id, message_id: msg.message_id });
    Api.sendMessage({
      chat_id: chat_id,
      receiver_user_id: userId,
      text: `${firstName}, Anti-Raid mode is active! All messages are temporarily restricted.`,
      parse_mode: "HTML"
    });
  } catch(e) {}
  return;
}

// Helper function for Warn / Action system with Auto-Punish (Feature 13)
async function punishUser(reasonText) {
  try {
    Api.deleteMessage({ chat_id: chat_id, message_id: msg.message_id });
    
    let warnKey = "warns_" + chat_id + "_" + userId;
    let warns = Bot.getProperty(warnKey, 0) + 1;
    Bot.setProperty(warnKey, warns, "integer");

    if (warns >= 3) {
      Bot.setProperty(warnKey, 0, "integer");
      let untilTime = Math.floor(Date.now() / 1000) + 300; // 5 mins mute on 3rd warning
      await Api.restrictChatMember({
        chat_id: chat_id,
        user_id: userId,
        until_date: untilTime,
        permissions: { can_send_messages: false, can_send_media_messages: false }
      });
      Api.sendMessage({
        chat_id: chat_id,
        receiver_user_id: userId,
        text: `${firstName}, reached 3 warnings for <b>${reasonText}</b>! You are muted for 5 minutes.`,
        parse_mode: "HTML"
      });
    } else {
      Api.sendMessage({
        chat_id: chat_id,
        receiver_user_id: userId,
        text: `${firstName}, warning <b>(${warns}/3)</b>: ${reasonText} is not allowed!`,
        parse_mode: "HTML"
      });
    }
  } catch(err) {}
}

// 1. Anti-Link Check
let antilink = Bot.getProperty("antilink_" + chat_id, "off");
if (antilink === "on") {
  let hasLink = false;
  if (entities && entities.length > 0) {
    for (let i = 0; i < entities.length; i++) {
      let type = entities[i].type;
      if (type === "url" || type === "text_link" || type === "mention" || type === "email") {
        hasLink = true;
        break;
      }
    }
  }
  if (!hasLink && /https?:\/\/|www\.|t\.me\/|telegram\.dog|[a-zA-Z0-9-]+\.(com|net|org|io|me|in|xyz|ru|co|biz|info)/i.test(text)) {
    hasLink = true;
  }

  if (hasLink) {
    await punishUser("Sharing Links");
    return;
  }
}

// 2. Anti-Forward Check
let antiforward = Bot.getProperty("antiforward_" + chat_id, "off");
if (antiforward === "on") {
  if (msg.forward_from || msg.forward_from_chat || msg.forward_date || msg.forward_sender_name) {
    await punishUser("Forwarded Content");
    return;
  }
}

// 3. Advanced Anti-NSFW / Adult Content Detector with 1-Min Mute
let antisns = Bot.getProperty("antisns_" + chat_id, "off");
if (antisns === "on") {
  let nsfwPatterns = [
    /\b(porn|sex|xxx|nude|nsfw|pussy|dick|cock|boobs|ass|blowjob|handjob|cum|orgasm|bdsm|milf|slut|whore|horny|vagina|penis|anal|masturbat|gangbang)\b/i,
    /\b(18\+|onlyfans|xvideos|pornhub|xnxx|stripchat|cammodel)\b/i,
    /(lingerie|bra|panties|undies)/i
  ];

  let lowerText = text.toLowerCase();
  let cleanText = lowerText.replace(/[^a-z0-9\s]/g, "");
  
  let isNsfw = false;
  for (let i = 0; i < nsfwPatterns.length; i++) {
    if (nsfwPatterns[i].test(lowerText) || nsfwPatterns[i].test(cleanText)) {
      isNsfw = true;
      break;
    }
  }

  if (msg.has_media_spoiler && (msg.caption || "").length > 0) {
    isNsfw = true;
  }

  if (isNsfw) {
    try {
      Api.deleteMessage({ chat_id: chat_id, message_id: msg.message_id });
      let untilTime = Math.floor(Date.now() / 1000) + 60;
      await Api.restrictChatMember({
        chat_id: chat_id,
        user_id: userId,
        until_date: untilTime,
        permissions: { can_send_messages: false, can_send_media_messages: false }
      });
      Api.sendMessage({ 
        chat_id: chat_id, 
        receiver_user_id: userId,
        text: `${firstName}, adult/NSFW content is prohibited! Muted for 1 minute.`, 
        parse_mode: "HTML"
      });
    } catch(err) {}
    return;
  }
}

// Feature 14: Custom Blacklisted Words Censor
let customBlacklist = Bot.getProperty("blacklist_" + chat_id, "");
if (customBlacklist) {
  let words = customBlacklist.toLowerCase().split(",");
  let lowerText = text.toLowerCase();
  let matched = false;
  for (let w = 0; w < words.length; w++) {
    let word = words[w].trim();
    if (word && lowerText.indexOf(word) !== -1) {
      matched = true;
      break;
    }
  }
  if (matched) {
    await punishUser("Blacklisted Word");
    return;
  }
}