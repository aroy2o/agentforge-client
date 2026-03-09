import { createSlice } from '@reduxjs/toolkit';

import { defaultAgents } from '../constants/defaultAgents';

const agentsSlice = createSlice({
    name: 'agents',
    initialState: {
        agents: defaultAgents,
        selectedAgent: null,
        isEditing: false,
    },
    reducers: {
        addAgent(state, action) {
            // Guard: do not push if an agent with the same id or name already exists
            const incoming = action.payload;
            const alreadyExists = state.agents.some(
                a => a.id === incoming.id || a.name.toLowerCase() === incoming.name.toLowerCase()
            );
            if (!alreadyExists) {
                state.agents.push(incoming);
            }
        },
        updateAgent(state, action) {
            const index = state.agents.findIndex((a) => a.id === action.payload.id);
            if (index !== -1) {
                state.agents[index] = { ...state.agents[index], ...action.payload };
            }
        },
        deleteAgent(state, action) {
            state.agents = state.agents.filter((a) => a.id !== action.payload);
        },
        setSelectedAgent(state, action) {
            state.selectedAgent = action.payload;
        },
        setIsEditing(state, action) {
            state.isEditing = action.payload;
        },
        updateAgentMemory(state, action) {
            const { id, entry } = action.payload;
            const agent = state.agents.find((a) => a.id === id);
            if (agent) {
                agent.memory.push(entry);
                if (agent.memory.length > 20) {
                    agent.memory.shift();
                }
            }
        },
        setAgents(state, action) {
            // Deduplicate by id — keep only first occurrence of each id
            const seen = new Set();
            state.agents = action.payload.filter(a => {
                const key = a.id || a._id;
                if (!key || seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        },
    },
});

export const {
    addAgent,
    updateAgent,
    deleteAgent,
    setSelectedAgent,
    setIsEditing,
    updateAgentMemory,
    setAgents,
} = agentsSlice.actions;

export default agentsSlice.reducer;
