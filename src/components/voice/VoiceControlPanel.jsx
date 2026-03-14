import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Mic, Volume2, VolumeX, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import { setContinuousMode, setEnabled, setMuted } from '../../store/voiceSlice';
import { useVoiceAgent } from '../../hooks/useVoiceAgent';

function StatusRow({ isListening, isThinking, isSpeaking }) {
  if (isListening) {
    return (
      <div className="flex items-center gap-2 text-xs text-cyan-200">
        <span className="inline-flex gap-1">
          <span className="h-2 w-1 rounded bg-cyan-300 animate-pulse" />
          <span className="h-2 w-1 rounded bg-cyan-300 animate-pulse [animation-delay:90ms]" />
          <span className="h-2 w-1 rounded bg-cyan-300 animate-pulse [animation-delay:180ms]" />
        </span>
        Listening...
      </div>
    );
  }

  if (isThinking) {
    return (
      <div className="flex items-center gap-2 text-xs text-orange-200">
        <span className="h-2 w-2 rounded-full bg-orange-300 animate-ping" />
        Thinking...
      </div>
    );
  }

  if (isSpeaking) {
    return (
      <div className="flex items-center gap-2 text-xs text-emerald-200">
        <span className="inline-flex gap-1">
          <span className="h-2 w-1 rounded bg-emerald-300 animate-pulse" />
          <span className="h-2 w-1 rounded bg-emerald-300 animate-pulse [animation-delay:90ms]" />
          <span className="h-2 w-1 rounded bg-emerald-300 animate-pulse [animation-delay:180ms]" />
        </span>
        Speaking...
      </div>
    );
  }

  return <div className="text-xs text-slate-300">Ready - tap mic to speak</div>;
}

export default function VoiceControlPanel() {
  const dispatch = useAppDispatch();
  const [expanded, setExpanded] = useState(false);
  const [micBlocked, setMicBlocked] = useState(false);

  const isEnabled = useAppSelector((s) => s.voice.isEnabled);
  const isMuted = useAppSelector((s) => s.voice.isMuted);
  const continuousMode = useAppSelector((s) => s.voice.continuousMode);

  const {
    isSupported,
    isListening,
    isThinking,
    isSpeaking,
    conversationHistory,
    followUpSuggestion,
    speak,
    startConversation,
    stopConversation,
  } = useVoiceAgent();

  const recentTurns = useMemo(() => conversationHistory.slice(-4), [conversationHistory]);

  const onMicPress = async () => {
    console.log('MIC BUTTON CLICKED');
    if (!isSupported) return;
    if (!isEnabled) dispatch(setEnabled(true));
    if (isListening || isThinking) {
      stopConversation();
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      try {
        const permission = await navigator.permissions.query({ name: 'microphone' });
        if (permission?.state === 'denied') {
          setMicBlocked(true);
          await speak('Microphone access is blocked. Please allow microphone permission in your browser settings and refresh the page.');
          return;
        }
      } catch {
        // Continue normally if permission status cannot be queried.
      }
    }

    setMicBlocked(false);
    startConversation();
  };

  const onCollapse = () => {
    setExpanded(false);
  };

  const isOrbMode = continuousMode && isEnabled && !isListening && !isSpeaking && !isThinking;

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <AnimatePresence mode="wait">
        {!expanded ? (
          <motion.button
            key="collapsed"
            type="button"
            onClick={() => setExpanded(true)}
            initial={{ opacity: 0, y: 10, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.92 }}
            className={`relative flex items-center justify-center rounded-full border shadow-[0_16px_40px_rgba(0,0,0,0.42)] ${isOrbMode ? 'h-14 w-14 border-orange-300/60 bg-orange-500/20' : 'h-16 w-16 border-cyan-300/40 bg-slate-950/90'}`}
            title="Open ARIA voice assistant"
          >
            <Mic className={`h-6 w-6 ${isListening ? 'text-red-300 animate-pulse' : 'text-cyan-200'}`} />
            {isThinking && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-orange-400" />}
            {isSpeaking && <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-400" />}
          </motion.button>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            className="w-[320px] rounded-2xl border border-orange-300/25 bg-slate-950/95 p-3 shadow-[0_22px_64px_rgba(0,0,0,0.5)] backdrop-blur-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-orange-200">
                <span className={`h-2.5 w-2.5 rounded-full ${isEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                ARIA
              </div>
              <button type="button" onClick={onCollapse} className="rounded-md border border-slate-700 p-1 text-slate-300 hover:text-white">
                <X size={14} />
              </button>
            </div>

            <div className="mb-3 h-[152px] overflow-hidden rounded-xl border border-slate-700/70 bg-slate-900/70 p-2">
              <div className="flex h-full flex-col gap-2 overflow-y-auto">
                {recentTurns.length === 0 && (
                  <div className="m-auto text-center text-xs text-slate-400">Start speaking and ARIA will respond here.</div>
                )}
                {recentTurns.map((turn, idx) => (
                  <div
                    key={`${turn.role}-${idx}-${turn.content.slice(0, 12)}`}
                    className={`max-w-[88%] rounded-xl px-3 py-2 text-xs leading-snug ${turn.role === 'user' ? 'ml-auto bg-slate-700 text-slate-100' : 'mr-auto bg-orange-500/20 text-orange-100 border border-orange-300/20'}`}
                  >
                    {turn.content}
                  </div>
                ))}
              </div>
            </div>

            {micBlocked && (
              <div className="mb-3 rounded-lg border border-red-400/45 bg-red-500/15 px-3 py-2 text-xs text-red-200">
                Microphone blocked — check browser permissions.
              </div>
            )}

            <div className="mb-3 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2">
              <StatusRow isListening={isListening} isThinking={isThinking} isSpeaking={isSpeaking} />
            </div>

            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => dispatch(setMuted(!isMuted))}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-200"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>

              <button
                type="button"
                onClick={onMicPress}
                className={`flex h-12 w-12 items-center justify-center rounded-full border ${isListening ? 'border-red-300 bg-red-500/70 text-white' : 'border-cyan-300 bg-cyan-500/70 text-white'}`}
                title="Start or stop voice"
              >
                <Mic size={20} className={isListening ? 'animate-pulse' : ''} />
              </button>

              <button
                type="button"
                onClick={() => dispatch(setContinuousMode(!continuousMode))}
                className={`rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] ${continuousMode ? 'border-emerald-300/45 bg-emerald-500/15 text-emerald-200' : 'border-slate-700 bg-slate-900 text-slate-400'}`}
                title="Toggle continuous mode"
              >
                Auto
              </button>
            </div>

            {followUpSuggestion && (
              <button
                type="button"
                onClick={() => startConversation(followUpSuggestion)}
                className="mt-2 w-full rounded-xl border border-orange-300/35 bg-orange-500/10 px-3 py-2 text-left text-xs text-orange-100 hover:bg-orange-500/20"
              >
                {followUpSuggestion}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
