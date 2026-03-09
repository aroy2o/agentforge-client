import { useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import store from '../store';
import { addToPipeline, clearPipeline } from '../store/pipelineSlice';
import { setTaskGoal } from '../store/taskSlice';
import { addLog } from '../store/logsSlice';
import { toggleTheme } from '../store/themeSlice';
import {
    setVoiceEnabled,
    setIsListening,
    setIsSpeaking,
    setIsMuted,
    setIsProcessingCommand,
    setLastTranscript,
    setLastCommandResult,
    addToConversationHistory,
    setActiveVoiceEngine,
} from '../store/voiceSlice';
import { useAgentRunner } from './useAgentRunner';
import * as api from '../services/api';
import toast from 'react-hot-toast';

// Maps LibreTranslate language codes to BCP-47 locale tags that SpeechRecognition understands
const SPEECH_RECOGNITION_LANGUAGES = {
    en: 'en-US',
    hi: 'hi-IN',
    bn: 'bn-IN',
    te: 'te-IN',
    ta: 'ta-IN',
    mr: 'mr-IN',
    gu: 'gu-IN',
    kn: 'kn-IN',
    pa: 'pa-IN',
    ml: 'ml-IN',
    or: 'or-IN',
    as: 'as-IN',
    ur: 'ur-PK',
    fr: 'fr-FR',
    es: 'es-ES',
    de: 'de-DE',
    zh: 'zh-CN',
    ja: 'ja-JP',
    ar: 'ar-SA',
};

function generateId() {
    return Math.random().toString(36).substring(2, 9);
}

export function useVoiceAgent() {
    const dispatch = useAppDispatch();

    // ── Redux state (persists across remounts) ─────────────────────────────────
    const agents = useAppSelector((state) => state.agents.agents);
    const selectedLanguage = useAppSelector((state) => state.language.selectedLanguage);
    const voiceEnabled = useAppSelector((state) => state.voice.voiceEnabled);
    const isListening = useAppSelector((state) => state.voice.isListening);
    const isSpeaking = useAppSelector((state) => state.voice.isSpeaking);
    const isMuted = useAppSelector((state) => state.voice.isMuted);
    const isProcessingCommand = useAppSelector((state) => state.voice.isProcessingCommand);


    // ── Refs (do not need to persist in Redux) ─────────────────────────────────
    const recognitionRef = useRef(null);
    const audioRef = useRef(null);
    const speakRef = useRef(null); // updated after speak is defined

    const navigate = useNavigate();
    const { executePipeline: _runPipeline } = useAgentRunner();

    // executePipeline always forwards the latest speak via speakRef
    const executePipeline = useCallback(
        () => _runPipeline({ speak: (...args) => speakRef.current?.(...args) }),
        [_runPipeline]
    );

    // ─── speak ─────────────────────────────────────────────────────────────────
    const speak = useCallback(async (text) => {
        console.log('[SPEAK DEBUG] voiceEnabled:', voiceEnabled, 'isMuted:', isMuted, 'text:', text?.substring(0, 30));
        console.log(`[Frontend Diagnostics] speak() called. voiceEnabled: ${voiceEnabled}, isMuted: ${isMuted}, text: ${text?.substring(0, 40)}`);

        const currentVoiceEnabled = store.getState().voice.voiceEnabled;
        const currentIsMuted = store.getState().voice.isMuted;

        if (!currentVoiceEnabled || currentIsMuted || !text) return;

        const fallbackSpeak = () => {
            console.log('[FALLBACK DEBUG] attempting browser speech synthesis');
            dispatch(setActiveVoiceEngine('browser'));
            console.log(`[Frontend Audio] Engine switching to: browser (Web Speech API)`);
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel(); // Stop any currently playing synthesis
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = SPEECH_RECOGNITION_LANGUAGES[selectedLanguage] || 'en-US';
                utterance.rate = 0.9;
                utterance.pitch = 1.0;
                utterance.onstart = () => dispatch(setIsSpeaking(true));
                utterance.onend = () => {
                    dispatch(setIsSpeaking(false));
                    dispatch(setActiveVoiceEngine('none'));

                    // Auto-restart mic logic
                    const currentVoiceEnabled = store.getState().voice.voiceEnabled;
                    const currentIsMuted = store.getState().voice.isMuted;
                    const currentIsListening = store.getState().voice.isListening;
                    const currentContinuous = store.getState().voice.continuousMode;

                    if (currentContinuous && currentVoiceEnabled && !currentIsMuted && !currentIsListening) {
                        setTimeout(() => {
                            startListening();
                        }, 600);
                    }
                };
                window.speechSynthesis.speak(utterance);
            }
        };

        try {
            const result = await api.speak(text);
            console.log('[API DEBUG] api.speak result:', result);

            if (!result || !result.data) {
                fallbackSpeak();
            } else {
                dispatch(setActiveVoiceEngine(result.engine));
                console.log(`[Frontend Audio] Transmitting ${result.data.byteLength} bytes. Engine: ${result.engine}`);

                const uint8Array = new Uint8Array(result.data);
                const blob = new Blob([uint8Array], { type: result.contentType });
                const url = URL.createObjectURL(blob);

                const audio = new Audio();
                audio.src = url;
                audioRef.current = audio;

                dispatch(setIsSpeaking(true));

                audio.addEventListener('canplaythrough', () => {
                    audio.play().catch(err => {
                        console.error('[useVoiceAgent] Audio play error:', err);
                        URL.revokeObjectURL(url);
                        dispatch(setIsSpeaking(false));
                        fallbackSpeak();
                    });
                });

                audio.addEventListener('ended', () => {
                    URL.revokeObjectURL(url);
                    dispatch(setIsSpeaking(false));
                    dispatch(setActiveVoiceEngine('none'));

                    const currentVoiceEnabled = store.getState().voice.voiceEnabled;
                    const currentIsMuted = store.getState().voice.isMuted;
                    const currentIsListening = store.getState().voice.isListening;
                    const currentContinuous = store.getState().voice.continuousMode;

                    if (currentContinuous && currentVoiceEnabled && !currentIsMuted && !currentIsListening) {
                        setTimeout(() => {
                            startListening();
                        }, 600);
                    }
                });

                audio.addEventListener('error', (e) => {
                    console.error(`[useVoiceAgent] Audio element error Code: ${e.target?.error?.code} Message: ${e.target?.error?.message}`);
                    URL.revokeObjectURL(url);
                    dispatch(setIsSpeaking(false));
                    fallbackSpeak();
                });
            }

            // Record in conversation history
            dispatch(addToConversationHistory({ role: 'assistant', content: text }));
        } catch (err) {
            console.error('[useVoiceAgent] speak error:', err);
            dispatch(setIsSpeaking(false));
            fallbackSpeak();
        }
    }, [dispatch]);

    // Keep speakRef current so executePipeline always gets the live speak fn
    speakRef.current = speak;

    // ─── processVoiceCommand ───────────────────────────────────────────────────
    const processVoiceCommand = useCallback(async (transcript) => {
        // 1. Set processing state and record the user's message
        dispatch(setIsProcessingCommand(true));
        dispatch(setLastTranscript(transcript));
        dispatch(addToConversationHistory({ role: 'user', content: transcript }));

        // 2. Snapshot conversation history at call time (avoids stale closure)
        const conversationHistory = store.getState().voice.conversationHistory;

        try {
            // 3. Call ARIA parser with full context
            const command = await api.parseVoiceCommand(transcript, conversationHistory);
            dispatch(setLastCommandResult(command));

            const {
                action = 'unknown',
                agentNames = [],
                taskGoal = '',
                shouldExecute = false,
                responseSpeech = '',
                navigateTo = null,
            } = command;

            // 4. Store ARIA's response in history
            dispatch(addToConversationHistory({ role: 'aria', content: responseSpeech }));

            // 5. Speak ARIA's response FIRST — before any app action executes
            if (responseSpeech) {
                await speak(responseSpeech);
            }

            // 6. Execute action
            if (action === 'execute_pipeline' || action === 'add_agents') {
                // Add each named agent to pipeline (case-insensitive match)
                for (const name of agentNames) {
                    const match = agents.find(
                        (a) => a.name.toLowerCase() === name.toLowerCase()
                    );
                    if (match) dispatch(addToPipeline(match.id));
                }
                if (taskGoal) dispatch(setTaskGoal(taskGoal));
                if (shouldExecute) {
                    await new Promise((r) => setTimeout(r, 1000));
                    executePipeline();
                }

            } else if (action === 'clear_pipeline') {
                dispatch(clearPipeline());

            } else if (action === 'set_task') {
                if (taskGoal) dispatch(setTaskGoal(taskGoal));

            } else if (action === 'run_now') {
                executePipeline();

            } else if (action === 'go_to_page' && navigateTo) {
                if (navigateTo === 'results') {
                    navigate('/results');
                } else if (navigateTo === 'builder') {
                    navigate('/builder');
                } else if (navigateTo === 'dashboard') {
                    navigate('/');
                }

            } else if (action === 'toggle_theme') {
                dispatch(toggleTheme());

            } else if (action === 'mute') {
                dispatch(setIsMuted(true));

            } else if (action === 'unmute') {
                dispatch(setIsMuted(false));

            } else if (action === 'converse') {
                // Pure conversation — responseSpeech already spoken above, no app action

            } else if (action === 'create_agent') {
                speak('Opening the agent builder for you.');
                navigate('/builder');

            } else if (action === 'unknown') {
                // If ARIA gave no responseSpeech, fall back to a static prompt
                if (!responseSpeech) {
                    speak("I didn't quite catch that. Try saying add agents to pipeline or set a task.");
                }
            }

        } catch (err) {
            console.error('[useVoiceAgent] processVoiceCommand error:', err);
            toast.error('Voice command processing failed.');
        } finally {
            dispatch(setIsProcessingCommand(false));
        }
    }, [agents, dispatch, executePipeline, navigate, speak]);

    // ─── startListening ────────────────────────────────────────────────────────
    const startListening = useCallback(() => {
        // Prevent starting if ARIA is currently speaking
        if (store.getState().voice.isSpeaking) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error('Speech recognition is not supported in this browser.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;

        // Dynamically get the latest selected language exactly when needed
        const currentLang = store.getState().language.selectedLanguage;
        recognition.lang = SPEECH_RECOGNITION_LANGUAGES[currentLang] || 'en-US';

        recognition.onresult = (event) => {
            const result = event.results[0];
            if (result.isFinal) {
                const transcript = result[0].transcript.trim();
                dispatch(addLog({
                    id: generateId(),
                    type: 'system',
                    content: `🎤 Voice command received: "${transcript}"`,
                    timestamp: new Date().toISOString(),
                }));
                processVoiceCommand(transcript);
            }
        };

        recognition.onend = () => dispatch(setIsListening(false));
        recognition.onerror = (event) => {
            console.error('[SpeechRecognition] Error:', event.error);
            dispatch(setIsListening(false));
            if (event.error === 'not-allowed') {
                toast.error('Microphone access denied. Please allow mic permissions.');
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
        dispatch(setIsListening(true));
    }, [dispatch, processVoiceCommand]);

    // ─── stopListening ─────────────────────────────────────────────────────────
    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        dispatch(setIsListening(false));
    }, [dispatch]);

    // ─── toggleVoice ───────────────────────────────────────────────────────────
    const toggleVoice = useCallback(() => {
        dispatch(setVoiceEnabled(!voiceEnabled));
    }, [dispatch, voiceEnabled]);

    // ─── toggleMute ────────────────────────────────────────────────────────────
    const toggleMute = useCallback(() => {
        dispatch(setIsMuted(!isMuted));
    }, [dispatch, isMuted]);

    return {
        // state (from Redux — persists across remounts)
        isListening,
        isSpeaking,
        isProcessingCommand,
        voiceEnabled,
        isMuted,
        // functions
        startListening,
        stopListening,
        toggleVoice,
        toggleMute,
        speak,
        processVoiceCommand,
    };
}
