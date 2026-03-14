import { useState, useRef, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../store';
import { setSelectedLanguage } from '../../store/languageSlice';
import { motion, AnimatePresence } from 'framer-motion';

// Mapping for standard UI display and flags
const LANGUAGE_DISPLAY = {
    en: { name: 'English', flag: '🇬🇧' },
    hi: { name: 'हिंदी', flag: '🇮🇳' },
    bn: { name: 'বাংলা', flag: '🇮🇳' },
    te: { name: 'తెలుగు', flag: '🇮🇳' },
    ta: { name: 'தமிழ்', flag: '🇮🇳' },
    mr: { name: 'मराठी', flag: '🇮🇳' },
    gu: { name: 'ગુજરાતી', flag: '🇮🇳' },
    kn: { name: 'ಕನ್ನಡ', flag: '🇮🇳' },
    pa: { name: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
    ml: { name: 'മലയാളം', flag: '🇮🇳' },
    or: { name: 'ଓଡ଼ିଆ', flag: '🇮🇳' },
    ur: { name: 'اردو', flag: '🇮🇳' },
    as: { name: 'অসমীয়া', flag: '🇮🇳' },
    fr: { name: 'Français', flag: '🇫🇷' },
    es: { name: 'Español', flag: '🇪🇸' },
    de: { name: 'Deutsch', flag: '🇩🇪' },
    zh: { name: '中文', flag: '🇨🇳' },
    ja: { name: '日本語', flag: '🇯🇵' },
    ar: { name: 'العربية', flag: '🇸🇦' },
};

export default function LanguageSelector() {
    const dispatch = useAppDispatch();
    const { selectedLanguage, supportedLanguages } = useAppSelector((state) => state.language);

    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = (code) => {
        dispatch(setSelectedLanguage(code));
        setIsOpen(false);
    };

    const currentDisplay = LANGUAGE_DISPLAY[selectedLanguage] || { name: selectedLanguage, flag: '🌐' };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-[36px] h-[36px] flex items-center justify-center rounded-lg glass-button-secondary transition-all cursor-pointer"
                title={currentDisplay.name}
            >
                <span className="text-[16px] leading-none mb-0.5">{currentDisplay.flag}</span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute right-0 top-full mt-3 w-40 max-h-80 overflow-y-auto scrollbar-thin glass-card flex flex-col p-2 z-[9999] shadow-xl"
                    >
                        {(supportedLanguages.length > 0 ? [...supportedLanguages.map(l => l.code), 'pa', 'ml', 'or', 'ur', 'as'] : Object.keys(LANGUAGE_DISPLAY)).filter((value, index, self) => self.indexOf(value) === index).map((code) => {
                            const display = LANGUAGE_DISPLAY[code];

                            // Only render if we have a mapped display for it to match requirements
                            if (!display) return null;

                            return (
                                <button
                                    key={code}
                                    onClick={() => handleSelect(code)}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-left ${selectedLanguage === code ? 'bg-black/5 dark:bg-white/10 text-slate-900 dark:text-white font-semibold' : 'text-slate-600 dark:text-slate-400'}`}
                                >
                                    <span className="text-base">{display.flag}</span>
                                    <span className="text-xs">{display.name}</span>
                                </button>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
