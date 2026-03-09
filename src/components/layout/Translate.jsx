import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../store';
import { addTranslation } from '../../store/languageSlice';
import * as api from '../../services/api';

const pendingTranslations = new Set();

export default function Translate({ children }) {
    const text = typeof children === 'string' ? children : String(children);
    const selectedLanguage = useAppSelector(state => state.language.selectedLanguage);
    const translations = useAppSelector(state => state.language.translations) || {};
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (!text || selectedLanguage === 'en') return;

        const hasTranslation = translations[selectedLanguage] && translations[selectedLanguage][text];
        const cacheKey = `${selectedLanguage}:${text}`;

        if (!hasTranslation && !pendingTranslations.has(cacheKey)) {
            pendingTranslations.add(cacheKey);
            api.translate(text, selectedLanguage).then(res => {
                dispatch(addTranslation({ lang: selectedLanguage, original: text, translated: res }));
                pendingTranslations.delete(cacheKey);
            }).catch(e => {
                pendingTranslations.delete(cacheKey);
            });
        }
    }, [text, selectedLanguage, dispatch]);

    if (selectedLanguage === 'en') return text;
    return (translations[selectedLanguage] && translations[selectedLanguage][text]) || text;
}
