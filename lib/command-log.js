/**
 * In-memory ring buffer of CLI invocations (via `lib/cli.js` hook).
 * Optional broadcast to renderer windows when entries are appended.
 */

const DEFAULT_MAX = 400;

let maxEntries = DEFAULT_MAX;
/** @type {Array<Record<string, unknown>>} */
const entries = [];
/** @type {((entry: Record<string, unknown>) => void) | null} */
let broadcast = null;

/**
 * @param {number} n
 */
function setMaxEntries(n) {
  if (Number.isFinite(n) && n >= 10 && n <= 5000) {
    maxEntries = Math.floor(n);
    while (entries.length > maxEntries) entries.shift();
  }
}

/**
 * @param {(entry: Record<string, unknown>) => void} fn
 */
function setBroadcast(fn) {
  broadcast = typeof fn === "function" ? fn : null;
}

/**
 * @param {Record<string, unknown>} record
 */
function append(record) {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    ...record,
  };
  entries.push(entry);
  while (entries.length > maxEntries) entries.shift();
  if (broadcast) {
    try {
      broadcast(entry);
    } catch {
      /* ignore */
    }
  }
}

function getAll() {
  return [...entries];
}

function clear() {
  entries.length = 0;
}

module.exports = {
  append,
  getAll,
  clear,
  setBroadcast,
  setMaxEntries,
  DEFAULT_MAX_ENTRIES: DEFAULT_MAX,
};
