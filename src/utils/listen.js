let activeRecognition = null;
let currentLang = 'en-US';

export function setRecognitionLanguage(langCode) {
  const map = {
    en: 'en-US',
    hi: 'hi-IN',
    es: 'es-ES',
    fr: 'fr-FR',
    de: 'de-DE',
    ta: 'ta-IN',
    bn: 'bn-IN',
  };

  const raw = String(langCode || '').trim();
  if (!raw) return;

  if (raw.includes('-')) {
    currentLang = raw;
  } else {
    currentLang = map[raw] || 'en-US';
  }
}

export function startListening(onResult, onError, options = {}) {
  let lastTranscript = '';
  let lastCommittedTranscript = '';
  let resetLastTranscriptTimer = null;
  let commitTimer = null;
  let lastInterimAt = 0;
  const trailingWords = new Set([
    'and', 'or', 'but', 'the', 'a', 'an', 'to', 'for', 'with', 'of',
    'in', 'at', 'on', 'that', 'which', 'when', 'if', 'so',
    'no', 'yes', 'ok', 'okay', 'sure', 'wait', 'actually', 'just', 'well', 'um', 'uh',
  ]);

  const scheduleCommit = (committedTranscript, confidence = 0, delayMs = 1800) => {
    commitTimer = setTimeout(() => {
      const tokens = String(committedTranscript || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
      const lastWord = tokens[tokens.length - 1] || '';

      if (tokens.length <= 3 && Date.now() - lastInterimAt < 500) {
        console.log('SHORT WORD EXTENDED:', committedTranscript);
        scheduleCommit(committedTranscript, confidence, 2000);
        return;
      }

      if (trailingWords.has(lastWord)) {
        console.log('EXTENDING - ends with:', lastWord);
        scheduleCommit(committedTranscript, confidence, 1500);
        return;
      }

      // DEDUPLICATION GUARD: Skip if this is the same committed transcript
      if (committedTranscript.trim() === lastCommittedTranscript.trim()) {
        console.log('DUPLICATE COMMIT BLOCKED:', committedTranscript);
        commitTimer = null;
        return;
      }

      lastCommittedTranscript = committedTranscript.trim();
      console.log('COMMITTED:', committedTranscript, 'confidence:', confidence);
      // Pass both transcript and confidence to callback
      onResult?.(committedTranscript, confidence);
      commitTimer = null;
    }, delayMs);
  };

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    onError?.('not-supported');
    return () => {};
  }

  if (activeRecognition) {
    try {
      activeRecognition.stop();
    } catch {
      // Ignore stop races when replacing sessions.
    }
    activeRecognition = null;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = currentLang;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const speakingNow = Boolean(options?.shouldBlock?.() || options?.getIsSpeaking?.());
    if (speakingNow) {
      console.log('ECHO BLOCKED - discarded while speaking');
      return;
    }

    const latestIndex = Math.max(0, Number(event?.results?.length || 1) - 1);
    const transcript = String(event?.results?.[latestIndex]?.[0]?.transcript || '');
    const confidence = Number(event?.results?.[latestIndex]?.[0]?.confidence ?? 0);
    lastInterimAt = Date.now();
    console.log('INTERIM:', transcript, 'confidence:', confidence);

    if (transcript === lastTranscript) {
      return;
    }
    lastTranscript = transcript;
    if (resetLastTranscriptTimer) {
      clearTimeout(resetLastTranscriptTimer);
    }
    resetLastTranscriptTimer = setTimeout(() => {
      lastTranscript = '';
      resetLastTranscriptTimer = null;
    }, 3000);

    if (!transcript.trim()) {
      onError?.('no-speech');
      return;
    }

    if (commitTimer) {
      clearTimeout(commitTimer);
      commitTimer = null;
    }

    scheduleCommit(transcript, confidence, 1800);
  };

  recognition.onerror = (event) => {
    console.log('LISTEN ERROR:', event?.error);
    onError?.(event?.error || 'unknown-error');
  };

  recognition.onend = () => {
    // Restart behavior is owned by the caller.
  };

  try {
    recognition.start();
    activeRecognition = recognition;
  } catch (error) {
    console.error('LISTEN START FAILED:', error);
    onError?.('start-failed');
  }

  return () => {
    try {
      recognition.stop();
    } catch {
      // Ignore stop races.
    }
    // Reset deduplication guard on stop
    lastCommittedTranscript = '';
    if (resetLastTranscriptTimer) {
      clearTimeout(resetLastTranscriptTimer);
      resetLastTranscriptTimer = null;
    }
    if (commitTimer) {
      clearTimeout(commitTimer);
      commitTimer = null;
    }
    if (activeRecognition === recognition) {
      activeRecognition = null;
    }
  };
}
