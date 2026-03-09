import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Power, Mic, MicOff, Volume2, VolumeX, ChevronUp, ChevronDown, Send } from 'lucide-react';
import { useVoiceAgent } from '../../hooks/useVoiceAgent';
import { useAppSelector, useAppDispatch } from '../../store';
import { setVoiceEnabled, setIsMuted, setContinuousMode } from '../../store/voiceSlice';

// ─── Conversation Bubble ───────────────────────────────────────────────────────
function ConversationBubble({ entry }) {
    const isUser = entry.role === 'user';
    return (
        <div className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            <span className="shrink-0 mt-0.5 text-[11px]" style={{ color: isUser ? 'var(--cyan)' : 'var(--purple)' }}>
                {isUser ? <Mic size={11} /> : '✦'}
            </span>
            <div
                className="rounded-lg px-3 py-2 text-[13px] leading-relaxed max-w-[280px] shadow-sm"
                style={{
                    background: isUser ? 'rgba(0,212,255,0.08)' : 'rgba(167,139,250,0.08)',
                    border: `1px solid ${isUser ? 'rgba(0,212,255,0.2)' : 'rgba(167,139,250,0.2)'}`,
                    color: isUser ? 'var(--text-primary)' : 'var(--text-primary)',
                    textAlign: isUser ? 'right' : 'left',
                }}
            >
                {entry.content}
            </div>
        </div>
    );
}

// ─── Animated Dots ─────────────────────────────────────────────────────────────
function AnimatedDots() {
    return (
        <motion.span
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        >
            ...
        </motion.span>
    );
}

// ─── Main Panel ────────────────────────────────────────────────────────────────
export default function VoiceControlPanel() {
    const dispatch = useAppDispatch();

    // Voice hook
    const {
        isListening,
        isSpeaking,
        isProcessingCommand,
        startListening,
        stopListening,
        processVoiceCommand,
        speak,
    } = useVoiceAgent();

    // Read voice state
    const voiceEnabled = useAppSelector((s) => s.voice.voiceEnabled);
    const isMuted = useAppSelector((s) => s.voice.isMuted);
    const conversationHistory = useAppSelector((s) => s.voice.conversationHistory);
    const continuousMode = useAppSelector((s) => s.voice.continuousMode);

    // Local UI state
    const [expanded, setExpanded] = useState(false);
    const [inputText, setInputText] = useState('');

    // Audio Warm-up
    useEffect(() => {
        speak('\u200B').catch(() => { });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Auto-scroll conversation
    const convoEndRef = useRef(null);
    useEffect(() => {
        if (expanded && convoEndRef.current) {
            convoEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [conversationHistory, expanded]);

    const visibleHistory = conversationHistory.slice(-6);

    // ── Handlers ────────────────────────────────────────────────────────────────
    const handleMicClick = () => {
        if (!voiceEnabled) return;
        if (isListening) stopListening();
        else startListening();
    };

    const handleTextSubmit = async () => {
        const cmd = inputText.trim();
        if (!cmd || isProcessingCommand) return;
        setInputText('');
        speak(`Processing your command: ${cmd}`);
        await processVoiceCommand(cmd);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleTextSubmit();
    };

    // ── Status text ──────────────────────────────────────────────────────────────
    const statusContent = (() => {
        if (isListening) return <><span className="text-red-500 mr-1">●</span>Listening<AnimatedDots /></>;
        if (isProcessingCommand) return <><span className="text-amber-500 mr-1">✦</span>ARIA is thinking<AnimatedDots /></>;
        if (isSpeaking) return <><span className="text-purple-400 mr-1">✦</span>ARIA is speaking<AnimatedDots /></>;
        if (voiceEnabled) return 'Click mic or type a command';
        return 'Voice disabled — click power to enable';
    })();

    return (
        <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 24, delay: 0.5 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass-card p-0 rounded-2xl overflow-hidden shadow-[var(--shadow-lg)] flex flex-col w-auto"
        >
            {/* Expand/collapse chevron */}
            <button
                onClick={() => setExpanded((e) => !e)}
                className="absolute top-2 right-3 w-4 h-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-transform z-10"
                style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                title={expanded ? 'Collapse history' : 'Expand conversation history'}
            >
                <ChevronUp className="w-full h-full" />
            </button>

            {/* ── Conversation History (expanded) ─────────────────────────────── */}
            <AnimatePresence initial={false}>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="px-4 pt-4 border-b border-[var(--border-subtle)]"
                    >
                        <div className="max-h-[220px] overflow-y-auto scrollbar-thin pr-2 pb-4 flex flex-col gap-3 min-w-[320px]">
                            {visibleHistory.length === 0 ? (
                                <div className="text-center text-12 text-[var(--text-muted)] py-4 italic">
                                    No conversation history yet.
                                </div>
                            ) : (
                                visibleHistory.map((entry, i) => (
                                    <ConversationBubble key={i} entry={entry} />
                                ))
                            )}
                            <div ref={convoEndRef} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Controls Row ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 px-5 py-3 shrink-0">
                {/* AUTO toggle */}
                <button
                    onClick={() => dispatch(setContinuousMode(!continuousMode))}
                    className={`h-[28px] px-3 rounded-full text-11 font-bold tracking-widest transition-colors flex items-center justify-center shrink-0 ${continuousMode
                        ? 'bg-[rgba(52,211,153,0.12)] border border-[rgba(52,211,153,0.30)] text-green-400'
                        : 'glass-button-secondary text-[var(--text-muted)] border-transparent'
                        }`}
                    title="Continuous listening mode"
                >
                    AUTO {continuousMode ? '●' : '○'}
                </button>

                {/* Power button */}
                <button
                    onClick={() => {
                        const ctx = new (window.AudioContext || window.webkitAudioContext)();
                        ctx.resume();
                        dispatch(setVoiceEnabled(!voiceEnabled));
                    }}
                    className={`w-[36px] h-[36px] rounded-lg flex items-center justify-center shrink-0 transition-all ${voiceEnabled
                        ? 'bg-[rgba(0,212,255,0.10)] border border-[var(--cyan)] text-[var(--cyan)] shadow-[0_0_8px_rgba(0,212,255,0.4)]'
                        : 'glass-button-secondary text-[var(--text-muted)] border-transparent'
                        }`}
                    title={voiceEnabled ? 'Disable voice' : 'Enable voice'}
                >
                    <Power className="w-[18px] h-[18px]" />
                </button>

                {/* Mic button */}
                <div className="relative flex items-center justify-center shrink-0">
                    {/* Idle pulse */}
                    {!isListening && !isSpeaking && !isProcessingCommand && voiceEnabled && (
                        <motion.div
                            className="absolute rounded-full border border-[var(--cyan)] opacity-30 w-[60px] h-[60px] pointer-events-none"
                            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.4, 0.1] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                        />
                    )}

                    {/* Listening ripples */}
                    {isListening && [0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className="absolute rounded-full bg-[var(--red)] pointer-events-none"
                            style={{ width: 52, height: 52 }}
                            animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4, ease: 'easeOut' }}
                        />
                    ))}

                    {/* Processing spinner ring */}
                    {isProcessingCommand && (
                        <motion.div
                            className="absolute rounded-full pointer-events-none"
                            style={{ border: '2px solid transparent', borderTopColor: 'var(--amber)', borderRightColor: 'var(--amber)', width: 60, height: 60 }}
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        />
                    )}

                    {/* Speaking purple glow */}
                    {isSpeaking && (
                        <motion.div
                            className="absolute rounded-full pointer-events-none"
                            style={{ background: 'rgba(167,139,250,0.3)', width: 64, height: 64, filter: 'blur(8px)' }}
                            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.7, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        />
                    )}

                    <button
                        onClick={handleMicClick}
                        disabled={!voiceEnabled}
                        className="w-[52px] h-[52px] rounded-full flex items-center justify-center relative z-10 transition-colors"
                        style={{
                            background: isListening
                                ? 'var(--red)'
                                : voiceEnabled ? 'rgba(0, 212, 255, 0.15)' : 'transparent',
                            border: `1px solid ${isListening ? 'var(--red)' : voiceEnabled ? 'var(--cyan)' : 'var(--border-strong)'}`,
                            color: isListening ? 'white' : voiceEnabled ? 'var(--cyan)' : 'var(--text-muted)',
                            opacity: voiceEnabled ? 1 : 0.4,
                            cursor: voiceEnabled ? 'pointer' : 'not-allowed',
                        }}
                    >
                        {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    </button>
                </div>

                {/* Mute button */}
                <button
                    onClick={() => dispatch(setIsMuted(!isMuted))}
                    className={`w-[36px] h-[36px] rounded-lg flex items-center justify-center shrink-0 transition-all ${isMuted
                        ? 'bg-[var(--glass-bg)] border border-[rgba(239,68,68,0.40)] text-red-400'
                        : 'glass-button-secondary text-[var(--green)] border-transparent'
                        }`}
                    title={isMuted ? 'Unmute ARIA' : 'Mute ARIA'}
                >
                    {isMuted ? <VolumeX className="w-[18px] h-[18px]" /> : <Volume2 className="w-[18px] h-[18px]" />}
                </button>
            </div>

            {/* ── Text Input Area ───────────────────────────────────────────── */}
            <div className="flex items-center gap-2 px-4 pb-1 shrink-0">
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a command to ARIA..."
                    disabled={isProcessingCommand}
                    className="flex-1 h-[36px] px-3 text-13 rounded-lg glass-input bg-[var(--glass-bg)] border border-[var(--border-subtle)] outline-none focus:border-[var(--cyan)] text-[var(--text-primary)] transition-colors min-w-[200px]"
                />
                <button
                    onClick={handleTextSubmit}
                    disabled={!inputText.trim() || isProcessingCommand}
                    className="w-[32px] h-[32px] glass-button-secondary rounded-lg flex items-center justify-center shrink-0 disabled:opacity-50"
                >
                    <Send className="w-[14px] h-[14px]" />
                </button>
            </div>

            {/* ── Status Text ──────────────────────────────────────────────── */}
            <div className="text-11 italic text-[var(--text-muted)] text-center pb-3 px-5 shrink-0 h-[26px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={`${isListening}-${isProcessingCommand}-${isSpeaking}-${voiceEnabled}`}
                        initial={{ opacity: 0, y: 2 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -2 }}
                    >
                        {statusContent}
                    </motion.div>
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
