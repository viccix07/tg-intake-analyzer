# Tashkent Multilingual Lead Engine (MVP)

Telegram webhook -> LLM intake (UZ/RU/EN) -> Google Sheets CRM + instant manager alert.

## 1. Install
```bash
npm install
cp .env.example .env   # then fill it in
```

## 2. Telegram bot
1. Open **@BotFather** -> `/newbot` -> copy the token into `TELEGRAM_BOT_TOKEN`.
2. Get the manager's chat ID: the manager messages **@userinfobot** (or your bot, then open
   `https://api.telegram.org/bot<TOKEN>/getUpdates`) -> copy `id` into `MANAGER_CHAT_ID`.
3. **The manager must press Start on your bot once**, or Telegram will refuse to deliver alerts.

## 3. LLM key
Create an OpenAI key and put it in `LLM_API_KEY` (default model `gpt-4o-mini`).

## 4. Google Sheets service account
1. https://console.cloud.google.com -> create/select a project.
2. **APIs & Services -> Library -> "Google Sheets API" -> Enable.**
3. **IAM & Admin -> Service Accounts -> Create** (no roles needed) -> open it -> **Keys -> Add key -> JSON**. A file downloads.
4. Create a Google Sheet. Copy the ID from the URL: `docs.google.com/spreadsheets/d/<THIS_PART>/edit` -> `GOOGLE_SHEETS_ID`.
5. Click **Share** on the sheet and add the service account's `client_email` as **Editor**. (Skipping this is the #1 reason it fails.)
6. Paste the whole JSON file as ONE line into `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS` now they are split to 3 different categories (PI, PK, CE):
   ```bash
   node -e "console.log(JSON.stringify(require('./your-key.json')))"
   ```
   The header row (Timestamp, Name, Phone, Language, Service, Preferred Time, Status) is auto-created if the tab is empty.

## 5. Run locally with ngrok
```bash
npm start                 # terminal 1
ngrok http 3000           # terminal 2
```
Put the ngrok `https://...` URL in `PUBLIC_URL` and restart. The app calls `setWebhook` automatically
(with `WEBHOOK_SECRET` as `secret_token`). Verify:
```bash
curl "https://api.telegram.org/bhot<TOKEN>/getWebhookInfo"
```
Message your bot and test in Uzbek, Russian and English.

## 6. Deploy on Render
1. Push to GitHub -> Render **New Web Service** -> Build `npm install`, Start `npm start`.
2. Add all env vars. Set `PUBLIC_URL` to the Render URL (`https://xxx.onrender.com`).
3. Free tier sleeps and drops in-memory chats; use a paid instance for real clients.

## Notes
- Conversation state is in-memory (24h TTL, 30 msgs per chat). For multi-instance/restart safety, swap `src/state.js` for Redis/SQLite.
- If Sheets fails, the manager still gets the alert plus a raw-JSON fallback message, so no lead vanishes.
- To use Claude Haiku instead, replace `src/llm.js` `complete()` with `@anthropic-ai/sdk` `messages.create` (system prompt goes in the `system` param).
"# tg-intake-analyzer" 
