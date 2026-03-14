import { createSlice } from '@reduxjs/toolkit';

const taskSlice = createSlice({
    name: 'task',
    initialState: {
        taskGoal: '',
        recipientEmail: '',
        toolAttachments: {
            attachedPDF: '',
            attachedImage: '',
            attachedImageMeta: null,
            attachedCode: '',
            codeLanguage: 'javascript',
            attachedData: '',
            currencyRequest: null,
            chartRequest: null,
        },
        pipelineResult: null,
        lastVoiceResult: '',
        isRunning: false,
        activeAgentId: null,
        completedTasks: [],
        rightTab: 'log',
        lastFailedAtStep: null,
    },
    reducers: {
        setTaskGoal(state, action) {
            state.taskGoal = action.payload;
        },
        setRecipientEmail(state, action) {
            state.recipientEmail = action.payload;
        },
        setToolAttachments(state, action) {
            state.toolAttachments = {
                ...state.toolAttachments,
                ...action.payload,
            };
        },
        clearToolAttachments(state) {
            state.toolAttachments = {
                attachedPDF: '',
                attachedImage: '',
                attachedImageMeta: null,
                attachedCode: '',
                codeLanguage: 'javascript',
                attachedData: '',
                currencyRequest: null,
                chartRequest: null,
            };
        },
        setPipelineResult(state, action) {
            state.pipelineResult = action.payload;
        },
        setLastVoiceResult(state, action) {
            state.lastVoiceResult = String(action.payload || '');
        },
        clearPipelineResult(state) {
            state.pipelineResult = null;
        },
        setIsRunning(state, action) {
            state.isRunning = action.payload;
        },
        setActiveAgent(state, action) {
            state.activeAgentId = action.payload;
        },
        setRightTab(state, action) {
            state.rightTab = action.payload;
        },
        addCompletedTask(state, action) {
            state.completedTasks.unshift(action.payload);
            state.completedTasks = state.completedTasks.slice(0, 20);
        },
        removeCompletedTask(state, action) {
            state.completedTasks = state.completedTasks.filter(
                (t) => t.id !== action.payload
            );
        },
        setCompletedTasks(state, action) {
            // Replace completedTasks with fresh DB data (on mount/load)
            state.completedTasks = action.payload;
        },
        setLastFailedAtStep(state, action) {
            state.lastFailedAtStep = action.payload; // number or null
        },
        updateTaskDbId(state, action) {
            // After DB persist, store the MongoDB _id so we can delete from DB later
            const { localId, dbId } = action.payload;
            const task = state.completedTasks.find(t => t.id === localId);
            if (task) task.dbId = dbId;
        },
    },
});

export const {
    setTaskGoal,
    setRecipientEmail,
    setToolAttachments,
    clearToolAttachments,
    setPipelineResult,
    setLastVoiceResult,
    clearPipelineResult,
    setIsRunning,
    setActiveAgent,
    setRightTab,
    addCompletedTask,
    removeCompletedTask,
    setCompletedTasks,
    setLastFailedAtStep,
    updateTaskDbId,
} = taskSlice.actions;

export default taskSlice.reducer;
