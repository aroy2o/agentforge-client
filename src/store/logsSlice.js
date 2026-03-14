import { createSlice } from '@reduxjs/toolkit';

const logsSlice = createSlice({
    name: 'logs',
    initialState: {
        logs: [
            {
                id: 'init-log',
                type: 'system',
                content: 'AgentForge initialized. Create agents, build a pipeline, and assign a mission.',
                timestamp: new Date().toISOString(),
            },
        ],
    },
    reducers: {
        addLog(state, action) {
            state.logs.push(action.payload);
        },
        updateLog(state, action) {
            const { id, ...updates } = action.payload;
            const index = state.logs.findIndex(l => l.id === id);
            if (index !== -1) {
                state.logs[index] = { ...state.logs[index], ...updates };
            }
        },
        clearLogs(state) {
            state.logs = [];
        },
    },
});

export const { addLog, updateLog, clearLogs } = logsSlice.actions;

export default logsSlice.reducer;
