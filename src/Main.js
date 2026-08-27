/**
 * Entry point: finds unprocessed invoice emails and uploads their
 * attachments to basepath/YYYY/QN/expenses in Drive. Safe to run
 * repeatedly - already-processed threads are skipped via Gmail labels,
 * and attachments already present in the destination folder are skipped
 * by filename.
 */
function processInvoiceEmails() {
  const processedLabel = getOrCreateLabel_(CONFIG.PROCESSED_LABEL_NAME);
  const failedLabel = getOrCreateLabel_(CONFIG.FAILED_LABEL_NAME);
  const query = buildSearchQuery_();
  const threads = GmailApp.search(query, 0, CONFIG.MAX_THREADS_PER_RUN);

  Logger.log(`Query: ${query}`);
  Logger.log(`Found ${threads.length} candidate thread(s).`);

  threads.forEach((thread) => {
    try {
      const savedCount = processThread_(thread);
      thread.addLabel(processedLabel);
      thread.removeLabel(failedLabel);
      Logger.log(`Thread ${thread.getId()}: saved ${savedCount} attachment(s).`);
    } catch (err) {
      thread.addLabel(failedLabel);
      Logger.log(`Thread ${thread.getId()} FAILED: ${err}`);
    }
  });
}

/** Processes every message in a thread, saving qualifying attachments. */
function processThread_(thread) {
  let savedCount = 0;
  thread.getMessages().forEach((message) => {
    const folder = getInvoiceFolderForDate_(message.getDate());
    message.getAttachments({ includeInlineImages: false, includeAttachments: true })
      .filter(isInvoiceAttachment_)
      .forEach((attachment) => {
        if (saveAttachment_(attachment, folder, message)) savedCount++;
      });
  });
  return savedCount;
}

function isInvoiceAttachment_(attachment) {
  return (
    CONFIG.ALLOWED_MIME_TYPES.indexOf(attachment.getContentType()) !== -1 &&
    attachment.getSize() >= CONFIG.MIN_ATTACHMENT_BYTES
  );
}

/** Saves the attachment to the folder unless it's already there. Returns true if saved. */
function saveAttachment_(attachment, folder, message) {
  const baseName = buildFileName_(attachment, message);
  const domain = getSenderDomain_(message);
  const fileName = uniqueFileName_(folder, baseName, attachment.getSize(), domain);
  if (fileName === null) {
    Logger.log(`Skipping duplicate: ${baseName}`);
    return false;
  }
  folder.createFile(attachment).setName(fileName);
  return true;
}

/**
 * Returns a filename safe to save under in folder: baseName itself if free,
 * null if a file named baseName already exists with the same byte size
 * (treated as the same attachment saved on a previous run), or baseName
 * tagged with the sender's domain - and, in the rare case that's *also*
 * taken by a different file, a numeric suffix on top - if same-named files
 * exist but differ in size (distinct attachments sharing a filename).
 */
function uniqueFileName_(folder, baseName, size, domain) {
  const candidates = [baseName, withTag_(baseName, domain)];
  for (const candidate of candidates) {
    const files = folder.getFilesByName(candidate);
    if (!files.hasNext()) return candidate;
    if (files.next().getSize() === size) return null;
  }
  for (let n = 2; ; n++) {
    const candidate = withTag_(baseName, `${domain}-${n}`);
    const files = folder.getFilesByName(candidate);
    if (!files.hasNext()) return candidate;
    if (files.next().getSize() === size) return null;
  }
}

function withTag_(baseName, tag) {
  const dotIndex = baseName.lastIndexOf('.');
  return dotIndex === -1
    ? `${baseName}_${tag}`
    : `${baseName.slice(0, dotIndex)}_${tag}${baseName.slice(dotIndex)}`;
}

/** Extracts and sanitizes the sender's domain from a message, e.g. "vendor.com". */
function getSenderDomain_(message) {
  const match = message.getFrom().match(/@([^>\s]+)/);
  const domain = match ? match[1] : 'unknown-sender';
  return sanitizeForFilename_(domain);
}

/** Keeps a filename-safe subset of characters: letters, digits, dot, hyphen. */
function sanitizeForFilename_(s) {
  return s.toLowerCase().replace(/[^a-z0-9.-]/g, '-');
}

function buildFileName_(attachment, message) {
  const dateStr = Utilities.formatDate(message.getDate(), CONFIG.TIMEZONE, 'yyyy-MM-dd');
  return `${dateStr}_${attachment.getName()}`;
}

/** Returns (creating if needed) basepath/YYYY/QN/expenses for the given date. */
function getInvoiceFolderForDate_(date) {
  const base = DriveApp.getFolderById(CONFIG.BASE_FOLDER_ID);
  const year = String(date.getFullYear());
  const quarter = 'Q' + (Math.floor(date.getMonth() / 3) + 1);

  const yearFolder = getOrCreateSubfolder_(base, year);
  const quarterFolder = getOrCreateSubfolder_(yearFolder, quarter);
  return getOrCreateSubfolder_(quarterFolder, 'expenses');
}

function getOrCreateSubfolder_(parent, name) {
  const existing = parent.getFoldersByName(name);
  return existing.hasNext() ? existing.next() : parent.createFolder(name);
}

function getOrCreateLabel_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}

function buildSearchQuery_() {
  const senderClauses = CONFIG.SENDERS.map((s) => `from:${s}`);
  const subjectClauses = CONFIG.SUBJECT_KEYWORDS.map((k) => `subject:"${k}"`);
  const matchClauses = senderClauses.concat(subjectClauses);

  if (matchClauses.length === 0) {
    throw new Error('CONFIG.SENDERS and CONFIG.SUBJECT_KEYWORDS are both empty - nothing to match.');
  }

  return [
    `(${matchClauses.join(' OR ')})`,
    'has:attachment',
    `newer_than:${CONFIG.SEARCH_WINDOW_DAYS}d`,
    `-label:"${CONFIG.PROCESSED_LABEL_NAME}"`,
  ].join(' ');
}

/**
 * Run this once from the Apps Script editor to turn the automation on.
 * Re-running it is safe - it replaces any existing trigger for this function.
 */
function installTrigger() {
  removeTriggers_();
  ScriptApp.newTrigger('processInvoiceEmails')
    .timeBased()
    .everyMinutes(CONFIG.TRIGGER_INTERVAL_MINUTES)
    .create();
  Logger.log(`Installed trigger: processInvoiceEmails every ${CONFIG.TRIGGER_INTERVAL_MINUTES} minutes.`);
}

/** Run to turn the automation off. */
function uninstallTrigger() {
  removeTriggers_();
  Logger.log('Removed all processInvoiceEmails triggers.');
}

function removeTriggers_() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'processInvoiceEmails')
    .forEach((t) => ScriptApp.deleteTrigger(t));
}
