let currentVoicePageHandlers = {};
let currentVoicePageContext = {};

export function registerVoicePageHandlers(handlers, contextExtras = {}) {
  currentVoicePageHandlers = handlers || {};
  currentVoicePageContext = contextExtras || {};

  return () => {
    if (currentVoicePageHandlers === handlers) {
      currentVoicePageHandlers = {};
      currentVoicePageContext = {};
    }
  };
}

export function getVoicePageHandlers() {
  return currentVoicePageHandlers || {};
}

export function getVoicePageContext() {
  return typeof currentVoicePageContext === 'function'
    ? (currentVoicePageContext() || {})
    : (currentVoicePageContext || {});
}
