import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    selectedLanguage: "en",
    supportedLanguages: [],
    isTranslating: false,
    translations: {},
};

const languageSlice = createSlice({
    name: 'language',
    initialState,
    reducers: {
        setSelectedLanguage: (state, action) => {
            state.selectedLanguage = action.payload;
        },
        setSupportedLanguages: (state, action) => {
            state.supportedLanguages = action.payload;
        },
        setIsTranslating: (state, action) => {
            state.isTranslating = action.payload;
        },
        addTranslation: (state, action) => {
            const { lang, original, translated } = action.payload;
            if (!state.translations[lang]) {
                state.translations[lang] = {};
            }
            state.translations[lang][original] = translated;
        }
    },
});

export const {
    setSelectedLanguage,
    setSupportedLanguages,
    setIsTranslating,
    addTranslation
} = languageSlice.actions;

export default languageSlice.reducer;
