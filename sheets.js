const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const cfg = require('./config');

const HEADERS = ['Timestamp', 'Name', 'Phone', 'Language', 'Service', 'Preferred Time', 'Status'];

const { google } = require('googleapis');
const config = require('./config');

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: config.googleClientEmail,
    private_key: config.googlePrivateKey ? config.googlePrivateKey.replace(/\\n/g, '\n') : undefined,
    project_id: config.googleProjectId,
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

module.exports = sheets;

const auth = new JWT({
  email: creds.client_email,
  key: String(creds.private_key).replace(/\\n/g, '\n'),
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
        await sheet.setHeaderRow(HEADERS); // empty sheet -> create header row
      }
      return sheet;
    })().catch((e) => {
      sheetPromise = null; // retry on next call
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
