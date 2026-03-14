import { createSlice } from '@reduxjs/toolkit';

function loadTemplates() {
    try {
        const stored = localStorage.getItem('agentforge_pipeline_templates');
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

function saveTemplatesToStorage(templates) {
    try {
        localStorage.setItem('agentforge_pipeline_templates', JSON.stringify(templates));
    } catch {}
}

const pipelineSlice = createSlice({
    name: 'pipeline',
    initialState: {
        pipeline: [],
        pipelineError: null,
        templates: loadTemplates(),
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
        saveTemplate(state, action) {
            const { name, agentIds } = action.payload;
            const id = Date.now().toString(36);
            state.templates.push({ id, name, agentIds, createdAt: new Date().toISOString() });
            saveTemplatesToStorage(state.templates);
        },
        deleteTemplate(state, action) {
            state.templates = state.templates.filter((t) => t.id !== action.payload);
            saveTemplatesToStorage(state.templates);
        },
    },
});

export const {
    addToPipeline,
    removeFromPipeline,
    reorderPipeline,
    clearPipeline,
    saveTemplate,
    deleteTemplate,
} = pipelineSlice.actions;

export default pipelineSlice.reducer;
