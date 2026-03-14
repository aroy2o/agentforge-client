import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import store, { useAppDispatch, useAppSelector } from '../store';
import {
    setConversationHistory,
    setLastTranscript,
    setLastARIASpeech,
    setLastUserSpeech,
    setListening,
    setSpeaking,
    setThinking,
    setFollowUpSuggestion,
    setHasOnboarded,
    setSupported,
} from '../store/voiceSlice';
import { speak as browserSpeak, stopSpeaking as cancelSpeech, getIsSpeaking } from '../utils/speak';
import { startListening as startBrowserListening, setRecognitionLanguage } from '../utils/listen';
import { addToPipeline, clearPipeline, removeFromPipeline, reorderPipeline } from '../store/pipelineSlice';
import { setTaskGoal } from '../store/taskSlice';
import { askVoiceAssistant, createCalendarEvents, saveUserPreferences } from '../services/api';
import { useAgentRunner } from './useAgentRunner';
import {
    addTurn,
    clearHistory,
    getHistory,
    getLastAssistantMessage,
    isRepeatRequest,
    setSchedulingSlot,
    getSchedulingSlots,
    clearSchedulingSlots,
} from '../utils/conversationMemory';
import { getVoicePageContext, getVoicePageHandlers } from '../utils/voicePageHandlers';
import { buildAriaContext } from '../utils/ariaContext';
import { setTheme } from '../store/themeSlice';
import { setSelectedLanguage as setAppLanguage } from '../store/languageSlice';
import { setSelectedLanguage as setVoiceLanguage } from '../store/voiceSlice';
import { extractEmail } from '../utils/normaliseTranscript';

let onboardingSpokenInSession = false;
let speakTypeLogged = false;
let greetingSpokenInSession = false;

export function useVoiceAgent() {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const stopRecognitionRef = useRef(() => {});
    const continueRef = useRef(false);
    const isProcessingRef = useRef(false);
    const restartTimerRef = useRef(null);
    const speakEndedAtRef = useRef(0);
    const pendingScheduleConfirmationRef = useRef(null);
    const { executePipeline, stopPipeline } = useAgentRunner();

    const isEnabled = useAppSelector((state) => state.voice.isEnabled);
    const isListening = useAppSelector((state) => state.voice.isListening);
    const isSpeakingState = useAppSelector((state) => state.voice.isSpeaking);
    const isThinking = useAppSelector((state) => state.voice.isThinking);
    const isMuted = useAppSelector((state) => state.voice.isMuted);
    const lastTranscript = useAppSelector((state) => state.voice.lastTranscript);
    const lastUserSpeech = useAppSelector((state) => state.voice.lastUserSpeech);
    const lastARIASpeech = useAppSelector((state) => state.voice.lastARIASpeech);
    const followUpSuggestion = useAppSelector((state) => state.voice.followUpSuggestion);
    const conversationHistory = useAppSelector((state) => state.voice.conversationHistory);
    const voiceRate = useAppSelector((state) => state.voice.voiceRate);
    const voicePitch = useAppSelector((state) => state.voice.voicePitch);
    const continuousMode = useAppSelector((state) => state.voice.continuousMode);
    const isSupported = useAppSelector((state) => state.voice.isSupported);
    const hasOnboarded = useAppSelector((state) => state.voice.hasOnboarded);
    const agents = useAppSelector((state) => state.agents.agents);
    const pipeline = useAppSelector((state) => state.pipeline.pipeline);
    const taskGoal = useAppSelector((state) => state.task.taskGoal);
    const userPreferences = useAppSelector((state) => state.auth.userPreferences || {});
    const userName = useAppSelector((state) => state.auth.user?.name || '');
    const googleCalendarConnected = useAppSelector((state) => state.auth.user?.googleCalendarConnected);

    useEffect(() => {
        const supported = typeof window !== 'undefined'
            && Boolean(window.speechSynthesis)
            && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
        dispatch(setSupported(supported));
    }, [dispatch]);

    useEffect(() => {
        if (!speakTypeLogged) {
            console.log('SPEAK FUNCTION:', typeof browserSpeak);
            speakTypeLogged = true;
        }
    }, []);

    const stopListening = useCallback(() => {
        try {
            stopRecognitionRef.current?.();
        } finally {
            stopRecognitionRef.current = () => {};
            dispatch(setListening(false));
        }
    }, [dispatch]);

    const speak = useCallback(async (text, options = {}) => {
        if (isMuted) return;
        const content = String(text || '').trim();
        if (!content) return;

        dispatch(setSpeaking(true));
        try {
            await browserSpeak(content, {
                rate: options.rate ?? voiceRate,
                pitch: options.pitch ?? voicePitch,
                volume: options.volume ?? 1.0,
            });
        } catch {
            toast.error('Unable to play speech output.');
        } finally {
            speakEndedAtRef.current = Date.now();
            dispatch(setSpeaking(false));
        }
    }, [dispatch, isMuted, voicePitch, voiceRate]);

    const stopSpeaking = useCallback(() => {
        cancelSpeech();
        dispatch(setSpeaking(false));
    }, [dispatch]);

    const executeAction = useCallback(async (action, actionData = {}) => {
        const pageHandlers = getVoicePageHandlers();
        const data = actionData && typeof actionData === 'object' ? actionData : {};

        const runScheduleFill = async (scheduleData) => {
            navigate('/scheduler');
            await new Promise((resolve) => setTimeout(resolve, 600));
            console.log('FILL SCHEDULE - task:', scheduleData.task, 'frequency:', scheduleData.frequency);
            if (typeof pageHandlers.voiceFillAndSubmit === 'function') {
                const result = await pageHandlers.voiceFillAndSubmit(scheduleData.task, scheduleData.frequency, scheduleData.email, scheduleData.suggestedPipeline);
                if (result?.success) {
                    addTurn('assistant', `Schedule created successfully for ${result.task || scheduleData.task || 'your task'} at ${result.frequency || scheduleData.frequency || 'the selected time'}. Sent to ${result.email || scheduleData.email || 'the provided email'}.`);
                    dispatch(setConversationHistory(getHistory()));
                    clearSchedulingSlots();
                }
                if (result?.emailValid === false) {
                    await speak('Form is filled. Please add your email address and click Schedule It, or say my email is [address] to set it.');
                }
                return null;
            }
            await new Promise((resolve) => setTimeout(resolve, 500));
            if (typeof getVoicePageHandlers().voiceFillAndSubmit === 'function') {
                const result = await getVoicePageHandlers().voiceFillAndSubmit(scheduleData.task, scheduleData.frequency, scheduleData.email, scheduleData.suggestedPipeline);
                if (result?.success) {
                    addTurn('assistant', `Schedule created successfully for ${result.task || scheduleData.task || 'your task'} at ${result.frequency || scheduleData.frequency || 'the selected time'}. Sent to ${result.email || scheduleData.email || 'the provided email'}.`);
                    dispatch(setConversationHistory(getHistory()));
                    clearSchedulingSlots();
                }
                if (result?.emailValid === false) {
                    await speak('Form is filled. Please add your email address and click Schedule It, or say my email is [address] to set it.');
                }
                return null;
            }
            return null;
        };

        const pageToRoute = {
            dashboard: '/dashboard',
            agents: '/agents',
            builder: '/agents',
            scheduler: '/scheduler',
            chat: '/chat',
            settings: '/settings',
            results: '/results',
        };

        const normalizeName = (name) => String(name || '').toLowerCase().trim();
        const byName = (name) => agents.find((a) => normalizeName(a.name) === normalizeName(name));

        const applySuggestedPipeline = async () => {
            if (!Array.isArray(data.suggestedPipeline) || !data.suggestedPipeline.length) return null;
            const ids = data.suggestedPipeline
                .map((agentName) => byName(agentName))
                .filter(Boolean)
                .map((agent) => agent.id || agent._id)
                .filter(Boolean);

            if (!ids.length) return null;
            dispatch(reorderPipeline(ids));
            return `I've set up ${data.suggestedPipeline.join(', ')} for that task. Say run pipeline when you're ready.`;
        };

        switch (action) {
            case 'navigate': {
                const route = pageToRoute[normalizeName(data.page)] || '/dashboard';
                navigate(route);
                return null;
            }
            case 'run_pipeline':
                console.log('RUN PIPELINE ACTION TRIGGERED - task:', taskGoal, 'agents:', pipeline);
                if (!Array.isArray(pipeline) || pipeline.length === 0) {
                    await speak('Please add at least one agent before running. Say add Scout to get started.');
                    return null;
                }
                if (!String(taskGoal || '').trim()) {
                    await speak('Please set a task first. Just tell me what you want to research or do.');
                    return null;
                }
                await speak('Running now.');
                await executePipeline({ speak });
                return null;
            case 'stop_pipeline':
                stopPipeline();
                return null;
            case 'clear_pipeline':
                dispatch(clearPipeline());
                return null;
            case 'add_agent': {
                const agent = byName(data.agentName);
                if (agent) dispatch(addToPipeline(agent.id || agent._id));
                return null;
            }
            case 'remove_agent': {
                const agent = byName(data.agentName);
                if (agent) dispatch(removeFromPipeline(agent.id || agent._id));
                return null;
            }
            case 'set_task': {
                if (data.task) dispatch(setTaskGoal(String(data.task)));
                return applySuggestedPipeline();
            }
            case 'read_last_result': {
                const taskState = store.getState().task;
                const resultText = String(taskState?.lastVoiceResult || '').trim();

                console.log('READING LAST RESULT FROM REDUX:', resultText ? resultText.substring(0, 100) : 'EMPTY');

                if (!resultText) {
                    return 'No recent pipeline results found. Run a pipeline first and then ask me to read the results.';
                }
                return resultText.length > 200 ? resultText.substring(0, 200) + '...' : resultText;
            }
            case 'show_schedule_list':
                navigate('/scheduler');
                return null;
            case 'create_schedule':
            case 'fill_schedule_form':
                if (data.__confirmed) {
                    return runScheduleFill(data);
                }

                pendingScheduleConfirmationRef.current = {
                    task: String(data.task || '').trim(),
                    frequency: String(data.frequency || '').trim(),
                    email: String(data.email || '').trim(),
                    suggestedPipeline: Array.isArray(data.suggestedPipeline) ? data.suggestedPipeline : [],
                };

                return `Final confirmation: schedule "${pendingScheduleConfirmationRef.current.task || 'your task'}" at "${pendingScheduleConfirmationRef.current.frequency || 'the selected time'}" to email "${pendingScheduleConfirmationRef.current.email || 'not set'}". Say confirm schedule to create it, or say change email.`;
            case 'add_to_calendar': {
                if (!googleCalendarConnected) {
                    await speak('Google Calendar is not connected yet. Please connect it from Integrations first.');
                    return null;
                }

                const task = String(data.task || taskGoal || 'task').trim();
                const date = String(data.date || 'today').trim();
                const time = String(data.time || '').trim();
                const todo = [task, date, time].filter(Boolean).join(' ').trim();
                const result = await createCalendarEvents([todo]);

                if (result?.success) {
                    return `Added to your Google Calendar: ${task}.`;
                }
                return 'I could not add that to your calendar right now. Please try again.';
            }
            case 'open_form':
                pageHandlers.openForm?.(data.formName || data.form || '');
                return null;
            case 'send_chat':
            case 'send_chat_message':
                pageHandlers.sendMessage?.(String(data.message || ''));
                return null;
            case 'new_chat':
            case 'new_chat_session':
            case 'open_chat':
                navigate('/chat');
                pageHandlers.newChat?.();
                return null;
            case 'save_settings':
                navigate('/settings');
                pageHandlers.saveSettings?.();
                return null;
            case 'search_web': {
                const task = String(data.task || data.query || '').trim();
                if (task) dispatch(setTaskGoal(task));
                if (data.runNow) {
                    await executePipeline({ speak });
                }
                return await applySuggestedPipeline();
            }
            case 'change_theme':
                if (data.theme === 'dark' || data.theme === 'light') {
                    dispatch(setTheme(data.theme));
                    await saveUserPreferences({
                        ...userPreferences,
                        theme: data.theme,
                        preferredTheme: data.theme,
                    });
                    console.log('THEME CHANGED TO:', data.theme);
                }
                return null;
            case 'change_language':
                {
                    const languageCodeMap = {
                        Hindi: 'hi',
                        Spanish: 'es',
                        French: 'fr',
                        German: 'de',
                        Tamil: 'ta',
                        Bengali: 'bn',
                        English: 'en',
                    };
                    const normalizedLanguage = String(data.language || '').trim();
                    const code = languageCodeMap[normalizedLanguage] || 'en';
                    const recognitionLangMap = {
                        en: 'en-US',
                        hi: 'hi-IN',
                        es: 'es-ES',
                        fr: 'fr-FR',
                        de: 'de-DE',
                        ta: 'ta-IN',
                        bn: 'bn-IN',
                    };
                    dispatch(setAppLanguage(code));
                    dispatch(setVoiceLanguage(recognitionLangMap[code] || 'en-US'));
                    setRecognitionLanguage(code);
                    await saveUserPreferences({
                        ...userPreferences,
                        language: code,
                        voiceRecognitionLanguage: recognitionLangMap[code] || 'en-US',
                    });
                    console.log('LANGUAGE CHANGED TO:', normalizedLanguage || 'English', code);
                    await speak(`Language changed to ${normalizedLanguage || 'English'}.`);
                }
                return null;
            case 'export_pdf':
            case 'clear_task':
                return null;
            default:
                return null;
        }
    }, [agents, dispatch, executePipeline, googleCalendarConnected, navigate, pipeline, speak, stopPipeline, taskGoal, userPreferences]);

    const stopConversation = useCallback(() => {
        continueRef.current = false;
        isProcessingRef.current = false;
        if (restartTimerRef.current) {
            clearTimeout(restartTimerRef.current);
            restartTimerRef.current = null;
        }
        stopListening();
        stopSpeaking();
        dispatch(setThinking(false));
    }, [dispatch, stopListening, stopSpeaking]);

    const startListening = useCallback((callbacks = {}) => {
        if (!isSupported) {
            const message = 'Speech recognition is not supported in this browser.';
            callbacks?.onError?.(message);
            toast.error(message);
            return;
        }

        stopListening();
        dispatch(setListening(true));

        const attachRecognition = () => {
            const stop = startBrowserListening(
                (transcript, confidence = 0) => {
                    console.log('MIC RESULT:', transcript, 'confidence:', confidence);

                    // FIX 1: DETECT AND REJECT GARBLED STT
                    // If confidence is exactly 0 AND word count > 10, likely garbled long utterance
                    const wordCount = transcript.trim().split(/\s+/).length;
                    if (confidence === 0 && wordCount > 10) {
                        console.log('GARBLED — low confidence long utterance, skipping API');
                        dispatch(setListening(false));
                        callbacks?.onError?.('garbled-speech');
                        return;
                    }
                    // If confidence 0 but short (< 6 words), might be valid short input like "hello" or "run it"

                    // FIX 2: HARD-BLOCK when ARIA is speaking (live check + short grace window)
                    // Prefer getIsSpeaking() (live utility truth) over isSpeakingState (Redux, may lag).
                    // Accept transcripts only after both the live flag is clear AND >= 300ms have passed
                    // since speaking ended (to absorb microphone ramp-down artefacts).
                    if (getIsSpeaking() || isSpeakingState || Date.now() - speakEndedAtRef.current < 300) {
                        console.log('BLOCKED — ARIA is speaking or just finished:', transcript);
                        return;
                    }

                    dispatch(setLastTranscript(transcript));
                    dispatch(setListening(false));
                    callbacks?.onResult?.(transcript);
                },
                async (error) => {
                    console.log('MIC ERROR:', error);
                    if (error === 'no-speech') {
                        if (continuousMode) {
                            if (restartTimerRef.current) {
                                clearTimeout(restartTimerRef.current);
                            }
                            restartTimerRef.current = setTimeout(() => {
                                attachRecognition();
                            }, 300);
                            return;
                        }

                        dispatch(setListening(false));
                        return;
                    }

                    dispatch(setListening(false));
                    callbacks?.onError?.(error);

                    const errorMessages = {
                        'not-allowed': 'Microphone permission is blocked. Please allow microphone access in your browser settings.',
                        'audio-capture': 'No microphone was detected. Please connect a microphone and try again.',
                        'garbled-speech': "I didn't catch that clearly. Could you say that again?",
                        network: 'Speech recognition network error. Please check your connection and try again.',
                        'not-supported': 'Speech recognition is not supported in this browser.',
                        'start-failed': 'Microphone failed to start. Please wait a moment and try again.',
                    };

                    await speak(errorMessages[error] || 'Speech recognition failed. Please try again.');
                },
                {
                    shouldBlock: () => getIsSpeaking() || isSpeakingState,
                    getIsSpeaking,
                }
            );

            stopRecognitionRef.current = stop;
        };

        attachRecognition();
    }, [continuousMode, dispatch, isSpeakingState, isSupported, speak, stopListening]);

    const processTranscript = useCallback(async (transcript) => {
        if (isProcessingRef.current) return;
        const clean = String(transcript || '').trim();
        if (!clean) return;

        const ariaOwnPhrases = [
            'how can i assist',
            'what can i do for you',
            "i'm aria",
            'opening the scheduler',
            'starting the pipeline',
            'switching to dark',
            'hi abhijeet',
            'pipeline complete',
            'agent done',
            "i've set",
            'shall i run',
        ];
        const lowered = clean.toLowerCase();
        if (ariaOwnPhrases.some((phrase) => lowered.includes(phrase))) {
            console.log(`ARIA SELF-ECHO BLOCKED: ${clean}`);
            return;
        }

        isProcessingRef.current = true;
        dispatch(setLastTranscript(clean));
        dispatch(setLastUserSpeech(clean));
        addTurn('user', clean);
        dispatch(setConversationHistory(getHistory()));

        if (isRepeatRequest(clean)) {
            const last = getLastAssistantMessage() || "I don't have anything to repeat yet.";
            await speak(last);
            isProcessingRef.current = false;
            return;
        }

        if (pendingScheduleConfirmationRef.current) {
            const loweredPending = clean.toLowerCase();
            const extractedEmail = extractEmail(clean);
            const isAffirmative = /(confirm|yes|go ahead|do it|proceed|create it|schedule it|okay|ok)/i.test(clean);
            const isNegative = /(cancel|stop|no|wrong email|change email|don't|do not)/i.test(clean);

            if (extractedEmail) {
                pendingScheduleConfirmationRef.current = {
                    ...pendingScheduleConfirmationRef.current,
                    email: extractedEmail,
                };
                setSchedulingSlot('email', extractedEmail);
                const prompt = `Updated email to ${extractedEmail}. Say confirm schedule to create it, or say cancel.`;
                addTurn('assistant', prompt);
                dispatch(setConversationHistory(getHistory()));
                dispatch(setLastARIASpeech(prompt));
                await speak(prompt);
                isProcessingRef.current = false;
                return;
            }

            if (isAffirmative) {
                const pending = pendingScheduleConfirmationRef.current;
                pendingScheduleConfirmationRef.current = null;
                const postActionSpeech = await executeAction('fill_schedule_form', {
                    ...pending,
                    __confirmed: true,
                });
                if (postActionSpeech) {
                    addTurn('assistant', postActionSpeech);
                    dispatch(setConversationHistory(getHistory()));
                    dispatch(setLastARIASpeech(postActionSpeech));
                    await speak(postActionSpeech);
                }
                isProcessingRef.current = false;
                return;
            }

            if (isNegative || loweredPending.includes('change')) {
                const prompt = 'Okay, I paused schedule creation. Please say the full email address to continue.';
                addTurn('assistant', prompt);
                dispatch(setConversationHistory(getHistory()));
                dispatch(setLastARIASpeech(prompt));
                await speak(prompt);
                isProcessingRef.current = false;
                return;
            }

            const prompt = 'Please say confirm schedule to create it, or say change email.';
            addTurn('assistant', prompt);
            dispatch(setConversationHistory(getHistory()));
            dispatch(setLastARIASpeech(prompt));
            await speak(prompt);
            isProcessingRef.current = false;
            return;
        }

        dispatch(setThinking(true));

        try {
            const pageExtras = getVoicePageContext();
            const context = buildAriaContext(store.getState(), location, pageExtras);
            context.lastTurns = getHistory().slice(-5);

            console.log('SENDING HISTORY:', getHistory().length, 'turns');

            const slots = getSchedulingSlots();
            const slotContextParts = [
                slots.task ? `Task already set: ${slots.task}` : '',
                slots.frequency ? `Time already set: ${slots.frequency}` : '',
                slots.email ? `Email already set: ${slots.email}` : '',
            ].filter(Boolean);
            const messageWithContext = slotContextParts.length
                ? `${clean} [Context: ${slotContextParts.join(' ')}]`
                : clean;

            const response = await askVoiceAssistant({
                message: messageWithContext,
                context,
                conversationHistory: getHistory(),
            });

            const responseData = response?.data ?? response;
            console.log('ARIA RESPONSE:', JSON.stringify(responseData));

            const actionData = responseData?.actionData && typeof responseData.actionData === 'object'
                ? responseData.actionData
                : {};
            if (responseData?.action === 'fill_schedule_form' || actionData.task || actionData.frequency || actionData.email) {
                if (actionData.task) setSchedulingSlot('task', actionData.task);
                if (actionData.frequency) setSchedulingSlot('frequency', actionData.frequency);
                if (actionData.email) setSchedulingSlot('email', actionData.email);
            }

            const speechText = String(responseData?.speech || '').trim() || "I didn't catch that clearly. Could you say that again?";
            addTurn('assistant', speechText);
            dispatch(setConversationHistory(getHistory()));
            dispatch(setLastARIASpeech(speechText));
            dispatch(setFollowUpSuggestion(responseData?.followUp || null));

            const isGreetingResponse = /how can i assist you today\?/i.test(speechText)
                && /i(?:\s|')m here to help!?/i.test(speechText);

            if (isGreetingResponse && greetingSpokenInSession) {
                console.log('SKIP SPEAK (greeting already spoken once):', speechText);
            } else {
                if (isGreetingResponse) {
                    greetingSpokenInSession = true;
                }
                console.log('CALLING SPEAK WITH:', speechText);
                await speak(speechText);
            }

            let postActionSpeech = null;
            if (responseData?.action) {
                postActionSpeech = await executeAction(responseData.action, responseData.actionData || {});
            }
            if (postActionSpeech) {
                addTurn('assistant', postActionSpeech);
                dispatch(setConversationHistory(getHistory()));
                dispatch(setLastARIASpeech(postActionSpeech));
                await speak(postActionSpeech);
            }
        } catch {
            const fallback = "I didn't catch that clearly. Could you say that again?";
            addTurn('assistant', fallback);
            dispatch(setConversationHistory(getHistory()));
            dispatch(setLastARIASpeech(fallback));
            await speak(fallback);
        } finally {
            dispatch(setThinking(false));
            isProcessingRef.current = false;

            if (continueRef.current && continuousMode) {
                // Wait until ARIA is done speaking before restarting listening.
                // Poll until isSpeaking clears, then add a short 300ms grace window.
                const scheduleRestart = () => {
                    if (getIsSpeaking()) {
                        restartTimerRef.current = setTimeout(scheduleRestart, 150);
                    } else {
                        restartTimerRef.current = setTimeout(() => {
                            startListening({
                                onResult: (transcript) => processTranscript(transcript),
                            });
                        }, 300);
                    }
                };
                scheduleRestart();
            }
        }
    }, [continuousMode, dispatch, executeAction, location, speak, startListening]);

    const startConversation = useCallback((manualText = '') => {
        continueRef.current = true;

        if (manualText && String(manualText).trim()) {
            processTranscript(String(manualText).trim());
            return;
        }

        startListening({
            onResult: (transcript) => processTranscript(transcript),
        });
    }, [processTranscript, speak, startListening]);

    useEffect(() => {
        if (!isEnabled || !continuousMode || !isSupported) return;
        if (isListening || isSpeakingState || isThinking || isProcessingRef.current) return;

        restartTimerRef.current = setTimeout(() => {
            if (continueRef.current) startConversation();
        }, 450);

        return () => {
            if (restartTimerRef.current) {
                clearTimeout(restartTimerRef.current);
                restartTimerRef.current = null;
            }
        };
    }, [continuousMode, isEnabled, isListening, isSpeakingState, isSupported, isThinking, startConversation]);

    useEffect(() => {
        if (!isEnabled || hasOnboarded || onboardingSpokenInSession) return;
        const firstName = String(userName || 'there').trim().split(' ')[0] || 'there';

        const timer = setTimeout(async () => {
            onboardingSpokenInSession = true;
            await speak(`Hi ${firstName}, I'm ARIA. What can I do for you?`);
            dispatch(setHasOnboarded(true));
            // Voice onboarding persistence is intentionally not saved on mic activation.
        }, 500);

        return () => clearTimeout(timer);
    }, [dispatch, hasOnboarded, isEnabled, speak, userName]);

    useEffect(() => () => {
        stopConversation();
    }, [stopConversation]);

    return {
        startConversation,
        stopConversation,
        startListening,
        stopListening,
        speak,
        stopSpeaking,
        executeAction,
        isEnabled,
        isListening,
        isSpeaking: isSpeakingState,
        isThinking,
        isMuted,
        lastTranscript,
        lastUserSpeech,
        lastARIASpeech,
        followUpSuggestion,
        conversationHistory,
        isSupported,
        clearConversation: () => {
            clearHistory();
            dispatch(setConversationHistory([]));
            dispatch(setFollowUpSuggestion(null));
        },
    };
}
