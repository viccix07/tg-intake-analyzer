console.log("Server file starting...1");
const express = require('express');
const cfg = require('./config');
const state = require('./state');
const tg = require('./telegram');
const llm = require('./llm');
const sheets = require('./sheets');
const msg = require('./messages');

const app = express();
app.use(express.json({ limit: '1mb' }));

// Telegram retries on non-200s; remember recent update_ids to avoid double-processing.
const seenUpdates = new Set();
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: config.googleClientEmail,
    private_key: config.googlePrivateKey.replace(/\\n/g, '\n'),
    project_id: config.googleProjectId,
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
function isDuplicate(id) {
  if (seenUpdates.has(id)) return true;
  seenUpdates.add(id);
  if (seenUpdates.size > 2000) seenUpdates.delete(seenUpdates.values().next().value);
  return false;
}

app.get('/health', (_req, res) => res.json({ ok: true }));

console.log("Server file starting...2");

app.post('/webhook', (req, res) => {
  if (cfg.webhookSecret && req.get('X-Telegram-Bot-Api-Secret-Token') !== cfg.webhookSecret) {
    return res.sendStatus(403);
  }
  res.sendStatus(200); // ack immediately; do the slow work async

  const update = req.body;
  const m = update && update.message;
  if (!m || !m.chat || isDuplicate(update.update_id)) return;
  if (m.chat.type !== 'private') return; // only 1:1 chats

  const chatId = m.chat.id;
  state.enqueue(chatId, () => handleMessage(chatId, m)).catch((e) =>
    console.error(`[chat ${chatId}] unhandled error:`, e)
  );
});

console.log("Server file starting...3");

async function handleMessage(chatId, m) {
  // Shared contact button -> treat as phone number text
  let text = m.text;
  if (!text && m.contact?.phone_number) text = `My phone number is ${m.contact.phone_number}`;

  if (!text) return tg.sendMessage(chatId, msg.UNSUPPORTED);

  if (text.trim().startsWith('/start')) {
    state.reset(chatId);
    return tg.sendMessage(chatId, msg.WELCOME);
  }

  state.push(chatId, 'user', text.slice(0, 2000));
  tg.sendTyping(chatId);

  let reply;
  try {
    reply = await llm.complete(state.history(chatId));
  } catch (e) {
    console.error(`[chat ${chatId}] LLM error:`, e.message);
    return tg.sendMessage(chatId, msg.TECH_ERROR);
  }

  const lead = llm.extractLead(reply);

  // Case A: still collecting info
  if (!lead) {
    if (!reply) return tg.sendMessage(chatId, msg.TECH_ERROR);
    state.push(chatId, 'assistant', reply);
    return tg.sendMessage(chatId, reply);
  }

console.log("Server file starting...4");

  // Case B: lead qualified
  lead.language = msg.normalizeLang(lead.language);
  lead.timestamp = new Date().toISOString(); // never trust the LLM's clock
  lead.status = 'QUALIFIED';
  console.log(`[chat ${chatId}] QUALIFIED lead:`, JSON.stringify(lead));

  // 1) Confirm to the user
  await tg.sendMessage(chatId, msg.confirmationFor(lead.language)).catch((e) =>
    console.error('Confirm send failed:', e.message)
  );

  // 2) + 3) Sheets and manager alert run independently: one failing must not block the other.
  const [sheetRes, alertRes] = await Promise.allSettled([
    retry(() => sheets.appendLead(lead)),
    retry(() => tg.sendMessage(cfg.managerChatId, msg.managerAlert(lead))),
  ]);
  if (sheetRes.status === 'rejected') {
    console.error('Sheets append FAILED:', sheetRes.reason?.message);
    // Fall back so the lead is never lost silently
    tg.sendMessage(
      cfg.managerChatId,
      `⚠️ Lead was NOT saved to Google Sheets (${sheetRes.reason?.message}). Raw data:\n${JSON.stringify(lead, null, 2)}`
    ).catch(() => {});
  }
  if (alertRes.status === 'rejected') console.error('Manager alert FAILED:', alertRes.reason?.message);

  state.reset(chatId); // fresh conversation for any next inquiry
}

console.log("Server file starting...5");

async function retry(fn, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 500 * 2 ** i));
    }
  }
  throw lastErr;
}

app.listen(cfg.port, async () => {
  console.log(`Lead engine listening on :${cfg.port}`);
  try {
    await sheets.getSheet();
    console.log('Google Sheets connected.');
  } catch (e) {
    console.error('Google Sheets init failed (check sharing + credentials):', e.message);
  }
  try {
    await tg.registerWebhook();
  } catch (e) {
    console.error('setWebhook failed:', e.message);
  }
});
