import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store';
import { toggleTheme } from '../../store/themeSlice';
import { logout, toggleCalendarPanel, setCalendarPanelOpen } from '../../store/authSlice';
import { Menu, Sun, Moon, LogOut, Calendar, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LanguageSelector from './LanguageSelector';
import Translate from './Translate';
import CalendarPanel from '../calendar/CalendarPanel';
import * as authService from '../../services/authService';
import * as api from '../../services/api';
import toast from 'react-hot-toast';

export default function Header({ onMenuClick }) {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const agents = useAppSelector((state) => state.agents.agents);
    const pipeline = useAppSelector((state) => state.pipeline.pipeline);
    const isRunning = useAppSelector((state) => state.task.isRunning);
    const isTranslating = useAppSelector((state) => state.language.isTranslating);
    const theme = useAppSelector((state) => state.theme?.theme || 'dark');
    const user = useAppSelector((state) => state.auth.user);
    const googleCalendarConnected = useAppSelector((state) => state.auth.googleCalendarConnected);
    const calendarPanelOpen = useAppSelector((state) => state.auth.calendarPanelOpen);

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSignOut = () => {
        authService.logout();
        dispatch(logout());
        navigate('/auth');
    };

    const initials = user?.name ? user.name.trim()[0].toUpperCase() : '?';

    const handleConnectCalendar = async () => {
        try {
            const url = await api.getGoogleAuthUrl();
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (error) {
            toast.error('Failed to start Google Calendar connection.');
        }
    };

    return (
        <>
        <header className="h-[64px] shrink-0 glass-header flex items-center px-4 md:px-6 gap-3 md:gap-6 z-50 relative">
            {/* Mobile Menu Button */}
            {onMenuClick && (
                <button
                    onClick={onMenuClick}
                    className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg glass-button-secondary transition-all cursor-pointer"
                    title="Open Menu"
                >
                    <Menu className="w-5 h-5" />
                </button>
            )}

            {/* Left section */}
            <div 
                className="flex items-center gap-2 md:gap-3 cursor-pointer"
                onClick={() => navigate('/')}
            >
                <span className="text-accent-cyan leading-none drop-shadow-[0_0_8px_rgba(0,212,255,0.6)]" style={{ fontSize: '32px' }}>
                    ⬡
                </span>
                <h1 className="text-[18px] font-bold tracking-wider text-[var(--text-primary)] uppercase m-0 leading-none mt-0.5 hidden xs:block sm:block">
                    AgentForge
                </h1>
            </div>
                <div className="ml-1 md:ml-[16px] bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.20)] rounded-full px-2 py-0.5 md:px-3 md:py-1 text-[10px] md:text-11 text-accent-cyan font-medium hidden sm:block shadow-[0_0_10px_rgba(0,212,255,0.1)]">
                    PS-A01 // PRAJUKTI 2026
                </div>

            {/* Center section */}
            <div className="flex-1 flex justify-center"></div>

            {/* Right section */}
            <div className="flex items-center gap-4 ml-auto">

                {/* Status Group */}
                <div className="flex items-center gap-4 hidden lg:flex">
                    {/* Status Item: Agents */}
                    <div className="flex items-center gap-2">
                        <span className="text-11 uppercase tracking-wider text-[var(--text-muted)]"><Translate>AGENTS</Translate></span>
                        <span className="text-12 font-semibold text-[var(--text-primary)]">{agents.length}</span>
                    </div>

                    <div className="w-[1px] h-[16px] bg-[var(--border-subtle)]" />

                    {/* Status Item: Pipeline */}
                    <div className="flex items-center gap-2">
                        <span className="text-11 uppercase tracking-wider text-[var(--text-muted)]"><Translate>PIPELINE</Translate></span>
                        <span className="text-12 font-semibold text-[var(--text-primary)]">{pipeline.length}</span>
                    </div>

                    <div className="w-[1px] h-[16px] bg-[var(--border-subtle)]" />

                    {/* Status Item: Status */}
                    <div className="flex items-center gap-2">
                        <span className="text-11 uppercase tracking-wider text-[var(--text-muted)]"><Translate>STATUS</Translate></span>
                        {isRunning ? (
                            <span className="text-12 font-semibold text-accent-green flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-accent-green rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                                <Translate>RUNNING</Translate>
                            </span>
                        ) : (
                            <span className="text-12 font-semibold text-[var(--text-muted)]"><Translate>IDLE</Translate></span>
                        )}
                    </div>
                </div>

                <div className="w-[1px] h-[20px] bg-[var(--border-default)] mx-1 hidden md:block" />

                {/* Translating Spinner & Action Buttons */}
                <div className="flex items-center gap-3">
                    <AnimatePresence>
                        {isTranslating && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="flex items-center"
                            >
                                <div className="w-4 h-4 border-2 border-[var(--cyan)] border-t-transparent rounded-full animate-spin" />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <LanguageSelector />

                    {!googleCalendarConnected ? (
                        <button
                            onClick={handleConnectCalendar}
                            className="h-[32px] px-3 flex items-center gap-1.5 glass-button-secondary text-12 font-medium rounded-lg"
                            title="Connect Google Calendar"
                        >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Connect Calendar</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => dispatch(toggleCalendarPanel())}
                            className="h-[32px] px-2.5 flex items-center justify-center rounded-lg border border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                            title="Google Calendar Connected"
                        >
                            <Calendar className="w-4 h-4" />
                        </button>
                    )}

                    {/* Theme Toggle */}
                    <button
                        onClick={() => dispatch(toggleTheme())}
                        className="w-[36px] h-[36px] rounded-lg flex items-center justify-center glass-button-secondary transition-all cursor-pointer"
                        title="Toggle Theme"
                    >
                        {theme === 'dark' ? (
                            <Sun className="w-4 h-4 hover:rotate-90 transition-transform duration-300" />
                        ) : (
                            <Moon className="w-4 h-4 hover:rotate-[360deg] transition-transform duration-300" />
                        )}
                    </button>

                    {/* Results Archive Button */}
                    <button
                        onClick={() => navigate('/results')}
                        className="hidden sm:flex h-[32px] px-3 items-center gap-1.5 glass-button-secondary text-12 font-medium transition-all cursor-pointer rounded-lg"
                        title="Mission Archive"
                    >
                        <span className="text-[11px]">📋</span>
                        <Translate>Results</Translate>
                    </button>
                </div>

                {/* User Avatar + Dropdown */}
                {user && (
                    <div className="relative ml-2" ref={dropdownRef}>
                        <button
                            onClick={() => setDropdownOpen(v => !v)}
                            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white cursor-pointer select-none transition-transform hover:scale-105"
                            style={{
                                background: 'linear-gradient(135deg, var(--cyan), #0088aa)',
                                boxShadow: 'var(--shadow-glow-cyan)'
                            }}
                            title={user.name}
                        >
                            {initials}
                        </button>

                        <AnimatePresence>
                            {dropdownOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                    transition={{ duration: 0.15 }}
                                    className="glass-card absolute right-0 top-full mt-3 min-w-[200px] py-2 z-50 rounded-xl border border-[var(--border-default)] shadow-xl"
                                >
                                    <div className="px-4 py-2">
                                        <div className="font-semibold text-14 text-[var(--text-primary)]">
                                            {user.name}
                                        </div>
                                        <div className="text-12 text-[var(--text-muted)] truncate">
                                            {user.email}
                                        </div>
                                    </div>

                                    <div className="my-1 border-t border-[var(--border-subtle)]" />

                                    <button
                                        onClick={() => {
                                            setDropdownOpen(false);
                                            navigate('/settings');
                                        }}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-[var(--glass-bg-hover)] text-[var(--text-secondary)] hover:text-accent-cyan transition-colors"
                                    >
                                        <Settings size={14} />
                                        <span className="text-13">Settings</span>
                                    </button>

                                    <button
                                        onClick={handleSignOut}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-[var(--glass-bg-hover)] text-[var(--text-secondary)] hover:text-[#ef4444] transition-colors"
                                    >
                                        <LogOut size={14} />
                                        <span className="text-13">Sign Out</span>
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </header>
        <AnimatePresence>
            {calendarPanelOpen && (
                <CalendarPanel onClose={() => dispatch(setCalendarPanelOpen(false))} />
            )}
        </AnimatePresence>
        </>
    );
}
