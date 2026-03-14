import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    isEnabled: false,
    isListening: false,
    isSpeaking: false,
    isThinking: false,
    isMuted: false,
    continuousMode: true,
    lastTranscript: '',
    lastUserSpeech: '',
    lastARIASpeech: '',
    followUpSuggestion: null,
    conversationHistory: [],
    voiceRate: 1.0,
    voicePitch: 1.0,
    selectedLanguage: 'en-US',
    isSupported: true,
    hasOnboarded: false,
};

const voiceSlice = createSlice({
    name: 'voice',
    initialState,
    reducers: {
        setEnabled: (state, action) => {
            state.isEnabled = action.payload;
        },
        setListening: (state, action) => {
            state.isListening = action.payload;
        },
        setSpeaking: (state, action) => {
            state.isSpeaking = action.payload;
        },
        setThinking: (state, action) => {
            state.isThinking = action.payload;
        },
        setMuted: (state, action) => {
            state.isMuted = action.payload;
        },
        setContinuousMode: (state, action) => {
            state.continuousMode = action.payload;
        },
        setLastTranscript: (state, action) => {
            state.lastTranscript = action.payload;
        },
        setLastUserSpeech: (state, action) => {
            state.lastUserSpeech = action.payload;
        },
        setLastARIASpeech: (state, action) => {
            state.lastARIASpeech = action.payload;
        },
        setFollowUpSuggestion: (state, action) => {
            state.followUpSuggestion = action.payload;
        },
        setConversationHistory: (state, action) => {
            state.conversationHistory = Array.isArray(action.payload) ? action.payload.slice(-10) : [];
        },
        setHasOnboarded: (state, action) => {
            state.hasOnboarded = action.payload;
        },
        setVoiceRate: (state, action) => {
            state.voiceRate = action.payload;
        },
        setVoicePitch: (state, action) => {
            state.voicePitch = action.payload;
        },
        setSelectedLanguage: (state, action) => {
            state.selectedLanguage = action.payload;
        },
        setSupported: (state, action) => {
            state.isSupported = action.payload;
        },
    },
});

export const {
    setEnabled,
    setListening,
    setSpeaking,
    setThinking,
    setMuted,
    setContinuousMode,
    setLastTranscript,
    setLastUserSpeech,
    setLastARIASpeech,
    setFollowUpSuggestion,
    setConversationHistory,
    setHasOnboarded,
    setVoiceRate,
    setVoicePitch,
    setSelectedLanguage,
    setSupported,
} = voiceSlice.actions;

export default voiceSlice.reducer;
