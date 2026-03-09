import { createSlice } from '@reduxjs/toolkit';

const taskSlice = createSlice({
    name: 'task',
    initialState: {
        taskGoal: '',
        isRunning: false,
        activeAgentId: null,
        completedTasks: [],
        rightTab: 'log',
    },
    reducers: {
        setTaskGoal(state, action) {
            state.taskGoal = action.payload;
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
    setIsRunning,
    setActiveAgent,
    setRightTab,
    addCompletedTask,
    removeCompletedTask,
    setCompletedTasks,
    updateTaskDbId,
} = taskSlice.actions;

export default taskSlice.reducer;
