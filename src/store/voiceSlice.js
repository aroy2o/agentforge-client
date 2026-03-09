import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    voiceEnabled: false,
    isListening: false,
    isSpeaking: false,
    isMuted: false,
    isProcessingCommand: false,
    lastTranscript: '',
    lastCommandResult: null,       // stores the last parsed command object
    conversationHistory: [],       // stores last 10 { role, content } exchanges
    continuousMode: true,          // whether to auto-restart mic after ARIA speaks
    activeVoiceEngine: 'none',     // 'elevenlabs', 'browser', or 'none'
};

const voiceSlice = createSlice({
    name: 'voice',
    initialState,
    reducers: {
        setVoiceEnabled: (state, action) => {
            state.voiceEnabled = action.payload;
        },
        setIsListening: (state, action) => {
            state.isListening = action.payload;
        },
        setIsSpeaking: (state, action) => {
            state.isSpeaking = action.payload;
        },
        setIsMuted: (state, action) => {
            state.isMuted = action.payload;
        },
        setIsProcessingCommand: (state, action) => {
            state.isProcessingCommand = action.payload;
        },
        setLastTranscript: (state, action) => {
            state.lastTranscript = action.payload;
        },
        setLastCommandResult: (state, action) => {
            state.lastCommandResult = action.payload;
        },
        addToConversationHistory: (state, action) => {
            // action.payload = { role: 'user'|'assistant', content: string }
            state.conversationHistory.push(action.payload);
            // Keep only the last 10 exchanges
            if (state.conversationHistory.length > 10) {
                state.conversationHistory = state.conversationHistory.slice(-10);
            }
        },
        clearConversationHistory: (state) => {
            state.conversationHistory = [];
        },
        setContinuousMode: (state, action) => {
            state.continuousMode = action.payload;
        },
        setActiveVoiceEngine: (state, action) => {
            state.activeVoiceEngine = action.payload;
        },
    },
});

export const {
    setVoiceEnabled,
    setIsListening,
    setIsSpeaking,
    setIsMuted,
    setIsProcessingCommand,
    setLastTranscript,
    setLastCommandResult,
    addToConversationHistory,
    clearConversationHistory,
    setContinuousMode,
    setActiveVoiceEngine,
} = voiceSlice.actions;

export default voiceSlice.reducer;
