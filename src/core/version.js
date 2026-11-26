/* ════════════════════════════════════════════════════════════════════════════
   1. CONSTANTS & DEFAULTS
   ════════════════════════════════════════════════════════════════════════════ */
/** Dashboard version (shown in Settings → About; bump it and add a CHANGELOG entry with every release). */
const APP_VERSION = '1.31.0';
const PLAN_GRACE_MIN = 45;   // Today's plan keeps items that ended this recently in view
/** Apps Script version this dashboard expects (doGet reports its own SCRIPT_VERSION). */
const REQUIRED_SCRIPT = '1.7';
/** Newest first. Each entry: version, date, and what changed (English / French). */
