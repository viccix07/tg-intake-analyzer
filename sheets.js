const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const cfg = require('./config');

const HEADERS = ['Timestamp', 'Name', 'Phone', 'Language', 'Service', 'Preferred Time', 'Status'];

// Authenticate using the split Google credentials
const auth = new JWT({
  email: cfg.googleClientEmail,
  key: cfg.googlePrivateKey ? cfg.googlePrivateKey.replace(/\\n/g, '\n') : '',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const doc = new GoogleSpreadsheet(cfg.sheetsId, auth);

let sheetPromise = null;
function getSheet() {
  if (!sheetPromise) {
    sheetPromise = (async () => {
      await doc.loadInfo();
      const sheet = doc.sheetsByIndex[cfg.sheetTabIndex];
      if (!sheet) throw new Error(`No sheet tab at index ${cfg.sheetTabIndex}`);
      try {
        await sheet.loadHeaderRow();
      } catch {
        await sheet.setHeaderRow(HEADERS);
      }
      return sheet;
    })().catch((e) => {
      sheetPromise = null;
      throw e;
    });
  }
  return sheetPromise;
}

async function appendLead(lead) {
  const sheet = await getSheet();
  await sheet.addRow({
    Timestamp: lead.timestamp,
    Name: lead.client_name,
    Phone: lead.phone_number,
    Language: lead.language,
    Service: lead.service_requested,
    'Preferred Time': lead.preferred_time,
    Status: lead.status,
  });
}

module.exports = { appendLead, getSheet };