/**
 * Edit the values below, then run `installTrigger` once from the Apps
 * Script editor to turn the automation on. See README.md for setup steps.
 */
const CONFIG = {
  // Drive folder ID of "basepath" (the parent that contains YYYY/QN/expenses).
  // Open the folder in Drive and copy the ID from the URL:
  // https://drive.google.com/drive/folders/<THIS_PART>
  BASE_FOLDER_ID: 'PUT_YOUR_DRIVE_FOLDER_ID_HERE',

  // Emails from these senders are treated as invoice candidates.
  // Accepts full addresses ("billing@vendor.com") or domains ("@vendor.com").
  SENDERS: [
    // 'billing@vendor.com',
    // '@anothervendor.com',
  ],

  // Emails whose subject contains any of these words/phrases (case-insensitive)
  // are also treated as invoice candidates.
  SUBJECT_KEYWORDS: ['invoice', 'receipt'],

  // Only attachments with these MIME types are saved to Drive.
  ALLOWED_MIME_TYPES: ['application/pdf', 'image/jpeg', 'image/png'],

  // Skip tiny attachments (logos, tracking pixels, inline signature images).
  MIN_ATTACHMENT_BYTES: 5 * 1024,

  // Gmail labels used to track automation state (created automatically).
  PROCESSED_LABEL_NAME: 'InvoiceAutomation/Processed',
  FAILED_LABEL_NAME: 'InvoiceAutomation/Failed',

  // Only search messages newer than this, to keep each run fast.
  SEARCH_WINDOW_DAYS: 60,

  // Safety cap on how many threads a single run will process.
  MAX_THREADS_PER_RUN: 50,

  // How often the trigger runs. Must be one of: 1, 5, 10, 15, 30.
  TRIGGER_INTERVAL_MINUTES: 15,

  // Timezone used when naming files with the message date.
  TIMEZONE: Session.getScriptTimeZone(),
};
