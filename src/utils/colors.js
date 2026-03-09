export const AGENT_COLORS = [
  '#00d4ff', // accent-cyan
  '#a78bfa', // accent-purple
  '#f59e0b', // accent-amber
  '#34d399', // accent-green
  '#f472b6', // accent-pink
  '#fb923c', // accent-orange
  '#e879f9', // accent-fuchsia
];

/**
 * Returns a random color from the AGENT_COLORS palette.
 * @returns {string} A hex color string
 */
export function getRandomColor() {
  return AGENT_COLORS[Math.floor(Math.random() * AGENT_COLORS.length)];
}
