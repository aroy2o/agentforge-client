import { createSlice } from '@reduxjs/toolkit';

const chatSlice = createSlice({
    name: 'chat',
    initialState: {
        sessions: [],
        activeSessionId: null,
        isLoading: false,
        searchQuery: '',
    },
    reducers: {
        setSessions(state, action) {
            state.sessions = action.payload;
        },
        addSession(state, action) {
            state.sessions.unshift(action.payload);
        },
        setActiveSession(state, action) {
            state.activeSessionId = action.payload;
        },
        addMessageToActiveSession(state, action) {
            const session = state.sessions.find(s => s.sessionId === state.activeSessionId);
            if (session) {
                session.messages.push(action.payload);
                session.updatedAt = new Date().toISOString();
            }
        },
        deleteSession(state, action) {
            state.sessions = state.sessions.filter(s => s.sessionId !== action.payload);
            if (state.activeSessionId === action.payload) {
                state.activeSessionId = null;
            }
        },
        setSearchQuery(state, action) {
            state.searchQuery = action.payload;
        },
        updateSessionTitle(state, action) {
            const { sessionId, title } = action.payload;
            const session = state.sessions.find(s => s.sessionId === sessionId);
            if (session) {
                session.title = title;
                session.updatedAt = new Date().toISOString();
            }
        }
    }
});

export const {
    setSessions,
    addSession,
    setActiveSession,
    addMessageToActiveSession,
    deleteSession,
    setSearchQuery,
    updateSessionTitle
} = chatSlice.actions;

export default chatSlice.reducer;
