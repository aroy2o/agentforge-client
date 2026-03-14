import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../store';
import { addTranslation } from '../store/languageSlice';
import * as api from '../services/api';

const pending = new Set();

const MAX_TRANSLATE_CHUNK = 1400;

function splitForTranslation(text, maxChars = MAX_TRANSLATE_CHUNK) {
    const source = String(text || '');
    if (source.length <= maxChars) return [source];

    const chunks = [];
    let cursor = 0;

    while (cursor < source.length) {
        const remaining = source.length - cursor;
        if (remaining <= maxChars) {
            chunks.push(source.slice(cursor));
            break;
        }

        let end = cursor + maxChars;
        const candidate = source.slice(cursor, end);

        // Prefer splitting at paragraph boundaries, then sentence boundaries, then whitespace.
        const paragraphBreak = candidate.lastIndexOf('\n\n');
        const lineBreak = candidate.lastIndexOf('\n');
        const sentenceBreak = Math.max(candidate.lastIndexOf('. '), candidate.lastIndexOf('? '), candidate.lastIndexOf('! '));
        const spaceBreak = candidate.lastIndexOf(' ');

        const bestBreak = [paragraphBreak, lineBreak, sentenceBreak, spaceBreak]
            .find((idx) => idx >= Math.floor(maxChars * 0.45));

        if (typeof bestBreak === 'number' && bestBreak >= 0) {
            end = cursor + bestBreak + 1;
        }

        chunks.push(source.slice(cursor, end));
        cursor = end;
    }

    return chunks.filter(Boolean);
}

async function translateLargeText(text, targetLanguage) {
    const chunks = splitForTranslation(text);
    if (chunks.length === 1) {
        return api.translate(chunks[0], targetLanguage);
    }

    const translatedChunks = [];
    for (const chunk of chunks) {
        const translated = await api.translate(chunk, targetLanguage);
        translatedChunks.push(translated);
    }

    return translatedChunks.join('');
}

/**
 * Translates `text` to the currently selected language.
 * Returns the translated string from the Redux cache, or the original while
 * the API call is in flight.  Falls back gracefully to original on errors.
 */
export function useTranslatedText(text) {
    const selectedLanguage = useAppSelector(s => s.language.selectedLanguage);
    const translations = useAppSelector(s => s.language.translations) || {};
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (!text || selectedLanguage === 'en') return;
        const cacheKey = `${selectedLanguage}:${text}`;
        const cached = translations[selectedLanguage]?.[text];
        if (!cached && !pending.has(cacheKey)) {
            pending.add(cacheKey);
            translateLargeText(text, selectedLanguage)
                .then(res => {
                    dispatch(addTranslation({ lang: selectedLanguage, original: text, translated: res }));
                    pending.delete(cacheKey);
                })
                .catch(() => pending.delete(cacheKey));
        }
    }, [text, selectedLanguage, dispatch]);

    if (selectedLanguage === 'en') return text;
    return translations[selectedLanguage]?.[text] || text;
}
