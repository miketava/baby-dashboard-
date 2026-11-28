/* ════════════════════════════════════════════════════════════════════════════
   1. CONSTANTS & DEFAULTS
   ════════════════════════════════════════════════════════════════════════════ */
/** Dashboard version (shown in Settings → About; bump it and add a CHANGELOG entry with every release). */
const APP_VERSION = '1.43.0';
/** “Make a copy” link for the blank template Sheet (Daily Log tab with the headers ready). */
const TEMPLATE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1_SqZC-ntwuU4Quo3q5gxOKk_gS4fthuISEdzy1mq-ZI/copy';
const PLAN_GRACE_MIN = 45;   // Today's plan keeps items that ended this recently in view
/** Apps Script version this dashboard expects (doGet reports its own SCRIPT_VERSION). */
const REQUIRED_SCRIPT = '1.9';
/** Newest first. Each entry: version, date, and what changed (English / French). */
