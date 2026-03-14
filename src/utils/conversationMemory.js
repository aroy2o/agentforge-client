let history = [];
let schedulingSlots = {
  task: null,
  frequency: null,
  email: null,
};

export function addTurn(role, content) {
  if (!(role === 'user' || role === 'assistant')) return;
  const text = String(content || '').trim();
  if (!text) return;

  history = [...history, { role, content: text }].slice(-20);
}

export function getHistory() {
  return [...history];
}

export function clearHistory() {
  history = [];
}

export function setSchedulingSlot(key, value) {
  if (!(key === 'task' || key === 'frequency' || key === 'email')) return;
  const text = value == null ? null : String(value).trim();
  schedulingSlots = {
    ...schedulingSlots,
    [key]: text || null,
  };
}

export function getSchedulingSlots() {
  return { ...schedulingSlots };
}

export function clearSchedulingSlots() {
  schedulingSlots = {
    task: null,
    frequency: null,
    email: null,
  };
}

export function getLastAssistantMessage() {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i]?.role === 'assistant' && history[i]?.content) {
      return history[i].content;
    }
  }
  return '';
}

export function isRepeatRequest(transcript) {
  const normalized = String(transcript || '').toLowerCase().trim();
  const repeatPhrases = new Set([
    'repeat that',
    'say that again',
    'what did you say',
    'come again',
    'say it again',
  ]);

  return repeatPhrases.has(normalized);
}
