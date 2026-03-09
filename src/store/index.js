import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import agentsReducer from './agentsSlice';
import pipelineReducer from './pipelineSlice';
import taskReducer from './taskSlice';
import logsReducer from './logsSlice';
import themeReducer from './themeSlice';
import languageReducer from './languageSlice';
import voiceReducer from './voiceSlice';
import authReducer from './authSlice';
import chatReducer from './chatSlice';

const store = configureStore({
    reducer: {
        agents: agentsReducer,
        pipeline: pipelineReducer,
        task: taskReducer,
        logs: logsReducer,
        theme: themeReducer,
        language: languageReducer,
        voice: voiceReducer,
        auth: authReducer,
        chat: chatReducer,
    },
});

export default store;

/** @type {() => import('@reduxjs/toolkit').ThunkDispatch} */
export const useAppDispatch = () => useDispatch();

/** @type {<T>(selector: (state: ReturnType<typeof store.getState>) => T) => T} */
export const useAppSelector = (selector) => useSelector(selector);
