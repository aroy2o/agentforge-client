/**
 * Formats a Date object into HH:MM:SS string.
 * @param {Date} date
 * @returns {string}
 */
export function formatTime(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * Truncates a string to maxLength, appending "..." if exceeded.
 * @param {string} str
 * @param {number} maxLength
 * @returns {string}
 */
export function truncate(str, maxLength) {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

/**
 * Formats milliseconds into a human-readable duration string like "4.2s".
 * @param {number} ms
 * @returns {string}
 */
export function formatDuration(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Generates a unique ID string.
 * @returns {string}
 */
export function generateId() {
  return Date.now().toString() + Math.random().toString(36).slice(2);
}
