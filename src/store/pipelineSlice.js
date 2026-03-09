import { createSlice } from '@reduxjs/toolkit';

const pipelineSlice = createSlice({
    name: 'pipeline',
    initialState: {
        pipeline: [],
        pipelineError: null,
    },
    reducers: {
        addToPipeline(state, action) {
            const agentId = action.payload;
            if (!state.pipeline.includes(agentId)) {
                state.pipeline.push(agentId);
            }
        },
        removeFromPipeline(state, action) {
            state.pipeline = state.pipeline.filter((id) => id !== action.payload);
        },
        reorderPipeline(state, action) {
            state.pipeline = action.payload;
        },
        clearPipeline(state) {
            state.pipeline = [];
        },
    },
});

export const {
    addToPipeline,
    removeFromPipeline,
    reorderPipeline,
    clearPipeline,
} = pipelineSlice.actions;

export default pipelineSlice.reducer;
