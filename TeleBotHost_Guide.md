### ✅ Quick Start for TeleBotHost (Node.js)

1. **Create Bot**  
   - Message **@BotFather** → `/newbot` → save your **Bot Token**

2. **Create Bot on TeleBotHost**  
   - Go to [console.telebothost.com](https://console.telebothost.com)  
   - Login with your Telegram account  
   - Click **"Add Bot"** → paste your Bot Token → click **"Launch Bot"**

3. **Deploy Your Code**  
   - In the console, open the **"Code" editor**  
   - Paste your full Node.js bot code (the `api/webhook.js` + `index.js` structure)  
   - Click **"Launch Bot"** in the console

4. **Set Webhook (if needed)**  
   - If using webhooks (not polling), your webhook URL will be:  
     `https://console.telebothost.com/api/webhook`  
   - Set this in your code's webhook URL parameter  
   - *Note: TeleBotHost handles polling automatically if you don't set a webhook*

5. **Set Environment Variables**  
   - In TeleBotHost console → **"Environment Variables"** section  
   - Add:  
     - `BOT_TOKEN` = your BotFather token  
     - `REDIS_URL` = your Upstash Redis URL (if using Redis for queue/pick data)  
     - `UPSTASH_REDIS_REST_TOKEN` = your Upstash Redis token  
     - `ADMIN_USERS` = your admin usernames (comma-separated)

6. **Test Immediately**  
   - Open Telegram → message your new bot  
   - Try `/pidor`, `/queue start Lab`, or `/enroll_daily`

### ✅ What's Already Working
- Your code structure (`api/webhook.js`, `index.js`, Redis) is compatible  
- Node.js + Express + Redis is supported by TeleBotHost  
- Webhooks or polling work out-of-the-box  

### 🔧 Quick Fix for Your Bot
Since you're using a webhook (based on `app.post("/webhook")` in your code), ensure:
1. Your bot is **launched** in TeleBotHost console  
2. Your webhook URL matches what you set in BotFather's webhook settings  
3. No port conflicts (TeleBotHost uses port 443 by default)  

### 🚀 Ready to Test
1. Go to [console.telebothost.com](https://console.telebothost.com)  
2. Create your bot  
3. Paste your code  
4. Launch it  
5. Test with `/pidor` or `/queue start Lab`  

No need for Vercel — TeleBotHost handles hosting, webhooks, and uptime for you. Just write your code and launch!