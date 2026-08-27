# gmail-automations

Automations for Gmail. Currently includes:

## Invoice → Google Drive

Watches Gmail for invoice emails and uploads their attachments into
`basepath/YYYY/QN/expenses` in Google Drive, where `YYYY`/`QN` are the year
and quarter the email arrived in.

How it works (`src/`, a Google Apps Script project):

- A time-driven trigger runs `processInvoiceEmails` every N minutes.
- It searches Gmail for messages with attachments from configured senders
  or with configured subject keywords, excluding threads already processed.
- Matching PDF/image attachments above a minimum size are saved into the
  correct `basepath/YYYY/QN/expenses` folder (subfolders are created
  automatically if they don't exist).
- Processed threads are labeled `InvoiceAutomation/Processed` so they're
  never handled twice; threads that error are labeled
  `InvoiceAutomation/Failed` and retried on the next run.
- Files already present in the destination folder (by name) are skipped,
  so re-running is always safe.

### Setup

1. **Create the Apps Script project.**
   - Easiest: go to [script.google.com](https://script.google.com), create
     a new project, and paste in the contents of `src/appsscript.json`
     (via Project Settings → enable "Show appsscript.json manifest file in
     editor"), `src/Config.js`, and `src/Main.js`.
   - Or via [clasp](https://github.com/google/clasp):
     ```
     npm install
     npm run login          # authorizes clasp with your Google account
     clasp create --type standalone --title "Invoice to Drive" --rootDir src
     ```
     Then copy `.clasp.json.example` to `.clasp.json` and fill in the
     `scriptId` clasp printed (or generated in `src/.clasp.json` — move it
     to the repo root), and run `npm run push` to sync these files.

2. **Find your Drive base folder ID.** Open the `basepath` folder in Drive
   (the one that directly contains, or will contain, `2026/Q3/expenses`
   etc.) and copy the ID from the URL:
   `https://drive.google.com/drive/folders/<THIS_PART>`.

3. **Edit `src/Config.js`:**
   - `BASE_FOLDER_ID`: the ID from step 2.
   - `SENDERS`: invoice sender addresses/domains, e.g. `'billing@vendor.com'`
     or `'@vendor.com'`.
   - `SUBJECT_KEYWORDS`: subject words/phrases to match, e.g. `'invoice'`.
   - Leave the rest at their defaults unless you want to tune attachment
     types/size, the search window, or the trigger interval.

4. **Authorize and turn it on.** In the Apps Script editor, select the
   `installTrigger` function and click Run. The first run will prompt you
   to authorize Gmail (read/modify) and Drive access — this is required so
   the script can read attachments, create Drive files/folders, and label
   processed threads. After that, `processInvoiceEmails` runs automatically
   on the configured interval.

5. **Test it.** Send yourself a test email matching your `SENDERS`/
   `SUBJECT_KEYWORDS` with a PDF attached, then run `processInvoiceEmails`
   manually from the editor (or wait for the trigger) and check
   `basepath/<year>/Q<quarter>/expenses` in Drive.

To turn the automation off, run `uninstallTrigger` once.
