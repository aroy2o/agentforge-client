let activeSessionToken = 0;
let isSpeaking = false;

function waitForVoices(timeoutMs = 1500) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve([]);
      return;
    }

    const synth = window.speechSynthesis;
    const existing = synth.getVoices();
    if (existing.length > 0) {
      resolve(existing);
      return;
    }

    let resolved = false;
    const handleVoicesChanged = () => finish();
    const finish = () => {
      if (resolved) return;
      resolved = true;
      synth.removeEventListener('voiceschanged', handleVoicesChanged);
      resolve(synth.getVoices());
    };

    synth.addEventListener('voiceschanged', handleVoicesChanged);
    setTimeout(finish, timeoutMs);
  });
}

function splitIntoChunks(text, maxLength = 800) {
  const raw = String(text || '').replace(/\s+/g, ' ').trim();
  if (!raw) return [];
  if (raw.length <= maxLength) return [raw];

  const sentences = raw.match(/[^.!?]+[.!?]*|[^.!?]+$/g) || [raw];
  const chunks = [];
  let current = '';

  for (const sentence of sentences.map((part) => part.trim()).filter(Boolean)) {
    if (!current) {
      current = sentence;
      continue;
    }

    if (`${current} ${sentence}`.length <= maxLength) {
      current = `${current} ${sentence}`;
      continue;
    }

    chunks.push(current);
    if (sentence.length <= maxLength) {
      current = sentence;
      continue;
    }

    const words = sentence.split(' ');
    let wordChunk = '';
    for (const word of words) {
      if (!wordChunk) {
        wordChunk = word;
      } else if (`${wordChunk} ${word}`.length <= maxLength) {
        wordChunk = `${wordChunk} ${word}`;
      } else {
        chunks.push(wordChunk);
        wordChunk = word;
      }
    }
    current = wordChunk;
  }

  if (current) chunks.push(current);
  return chunks;
}

async function resolveBestVoiceObject() {
  const voices = await waitForVoices();
  if (!voices.length) return null;

  const ranked = voices
    .map((voice) => {
      const name = String(voice?.name || '').toLowerCase();
      const lang = String(voice?.lang || '').toLowerCase();
      let score = 0;

      if (name.includes('google')) score += 4;
      if (name.includes('natural')) score += 3;
      if (name.includes('enhanced')) score += 3;
      if (lang.startsWith('en')) score += 2;
      if (voice?.default) score += 1;

      return { voice, score };
    })
    .sort((left, right) => right.score - left.score);

  return ranked[0]?.voice || voices[0] || null;
}

export async function getBestVoice() {
  const voice = await resolveBestVoiceObject();
  return voice?.name || 'System default';
}

export function stopSpeaking() {
  activeSessionToken += 1;
  isSpeaking = false;
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export function getIsSpeaking() {
  return isSpeaking;
}

export async function speak(text, options = {}) {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis || typeof window.SpeechSynthesisUtterance === 'undefined') {
      return;
    }

    const content = String(text || '').trim();
    if (!content) return;

    stopSpeaking();
    const sessionToken = activeSessionToken;
    const synth = window.speechSynthesis;
    const voice = await resolveBestVoiceObject();
    const chunks = splitIntoChunks(content, 800);
    isSpeaking = true;

    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i];
      if (sessionToken !== activeSessionToken) return;

      await new Promise((resolve) => {
        const utterance = new window.SpeechSynthesisUtterance(chunk);
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang;
        }
        utterance.rate = Number(options.rate ?? 1.0);
        utterance.pitch = Number(options.pitch ?? 1.0);
        utterance.volume = Number(options.volume ?? 1.0);
        utterance.onend = () => {
          if (i === chunks.length - 1) {
            isSpeaking = false;
            console.log('SPEAK ENDED');
          }
          resolve();
        };
        utterance.onerror = () => {
          isSpeaking = false;
          resolve();
        };
        synth.speak(utterance);
      });
    }
  } catch {
    isSpeaking = false;
    return;
  }
}
