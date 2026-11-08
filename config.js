require('dotenv').config();

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

module.exports = {
  telegramToken: required('TELEGRAM_BOT_TOKEN'),
  managerChatId: required('MANAGER_CHAT_ID'),
  llmApiKey: required('LLM_API_KEY'),
  llmModel: process.env.LLM_MODEL || 'gpt-4o-mini',
  sheetsId: required('GOOGLE_SHEETS_ID'),
  googleClientEmail: required('GOOGLE_CLIENT_EMAIL'),
  googlePrivateKey: required('GOOGLE_PRIVATE_KEY'),
  googleProjectId: required('GOOGLE_PROJECT_ID'),
  sheetTabIndex: parseInt(process.env.SHEET_TAB_INDEX || '0', 10),
  webhookSecret: process.env.WEBHOOK_SECRET || '',
  publicUrl: (process.env.PUBLIC_URL || '').replace(/\/$/, ''),
  businessName: process.env.BUSINESS_NAME || 'our company',
  businessType: process.env.BUSINESS_TYPE || 'local business in Tashkent',
  port: parseInt(process.env.PORT || '3000', 10),
};
