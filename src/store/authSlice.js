import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: null,
        token: null,
        isAuthenticated: false,
        googleCalendarConnected: false,
        calendarPanelOpen: false,
        notificationsEnabled: true,
        notifications: {
            emailEnabled: false,
            emailAddress: '',
            notifyOnPipelineComplete: true,
            notifyOnScheduledTask: true,
            notifyOnCalendarCreated: true,
        },
        userPreferences: {
            showPipelineRecommendations: true,
            showEmailField: true,
            autoSendEmail: false,
            voiceEnabledByDefault: false,
            autoOptimisePrompts: true,
            voiceControlEnabled: false,
            voiceContinuousMode: true,
            voiceMuted: false,
            voiceRate: 1.0,
            voicePitch: 1.0,
            voiceRecognitionLanguage: 'en-US',
            voiceOnboarded: false,
        },
        isLoading: true,
        error: null,
    },
    reducers: {
        setUser(state, action) {
            state.user = action.payload;
        },
        setToken(state, action) {
            state.token = action.payload;
        },
        setAuthenticated(state, action) {
            state.isAuthenticated = action.payload;
        },
        setGoogleCalendarConnected(state, action) {
            state.googleCalendarConnected = action.payload;
        },
        toggleCalendarPanel(state) {
            state.calendarPanelOpen = !state.calendarPanelOpen;
        },
        setCalendarPanelOpen(state, action) {
            state.calendarPanelOpen = action.payload;
        },
        setNotificationsEnabled(state, action) {
            state.notificationsEnabled = action.payload;
        },
        setNotificationsState(state, action) {
            state.notifications = {
                ...state.notifications,
                ...(action.payload || {}),
            };
        },
        setUserPreferencesState(state, action) {
            state.userPreferences = {
                ...state.userPreferences,
                ...(action.payload || {}),
            };
        },
        setLoading(state, action) {
            state.isLoading = action.payload;
        },
        setAuthError(state, action) {
            state.error = action.payload;
        },
        logout(state) {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            state.googleCalendarConnected = false;
            state.calendarPanelOpen = false;
            state.notificationsEnabled = true;
            state.notifications = {
                emailEnabled: false,
                emailAddress: '',
                notifyOnPipelineComplete: true,
                notifyOnScheduledTask: true,
                notifyOnCalendarCreated: true,
            };
            state.userPreferences = {
                showPipelineRecommendations: true,
                showEmailField: true,
                autoSendEmail: false,
                voiceEnabledByDefault: false,
                autoOptimisePrompts: true,
                voiceControlEnabled: false,
                voiceContinuousMode: true,
                voiceMuted: false,
                voiceRate: 1.0,
                voicePitch: 1.0,
                voiceRecognitionLanguage: 'en-US',
                voiceOnboarded: false,
            };
            state.error = null;
            state.isLoading = false;
        },
    },
});

export const {
    setUser,
    setToken,
    setAuthenticated,
    setGoogleCalendarConnected,
    toggleCalendarPanel,
    setCalendarPanelOpen,
    setNotificationsEnabled,
    setNotificationsState,
    setUserPreferencesState,
    setLoading,
    setAuthError,
    logout,
} = authSlice.actions;
export default authSlice.reducer;
