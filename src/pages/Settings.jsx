import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell,
    Mail,
    Loader2,
    Check,
    X,
    Link as LinkIcon,
    User,
    Sliders,
    Palette,
    AlertTriangle,
    Mic,
    Volume2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import AppLayout from '../components/layout/AppLayout';
import LanguageSelector from '../components/layout/LanguageSelector';
import Translate from '../components/layout/Translate';
import { useAppDispatch, useAppSelector } from '../store';
import { toggleTheme } from '../store/themeSlice';
import {
    setGoogleCalendarConnected,
    setNotificationsEnabled,
    setNotificationsState,
    setUserPreferencesState,
    logout,
} from '../store/authSlice';
import { setAgents } from '../store/agentsSlice';
import * as api from '../services/api';
import * as authService from '../services/authService';
import { useVoiceAgent } from '../hooks/useVoiceAgent';
import { registerVoicePageHandlers } from '../utils/voicePageHandlers';

const TABS = [
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'integrations', label: 'Integrations', icon: LinkIcon },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'preferences', label: 'Preferences', icon: Sliders },
    { id: 'voice', label: 'Voice', icon: Mic },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'danger', label: 'Danger Zone', icon: AlertTriangle, danger: true },
];

const INPUT_CLASS = 'glass-input h-10 text-13 rounded-lg border border-[var(--border-subtle)] focus:border-cyan-400/40 px-3 w-full bg-transparent text-[var(--text-primary)]';

function Toggle({ checked, onChange, disabled = false }) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`w-[44px] h-[24px] rounded-full relative transition-all duration-200 border ${checked ? 'bg-accent-cyan border-cyan-300/50 shadow-[0_0_10px_rgba(0,212,255,0.35)]' : 'bg-[var(--glass-bg)] border-[var(--border-subtle)]'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            <span
                className={`absolute top-[2px] h-[20px] w-[20px] rounded-full bg-white transition-all duration-200 ${checked ? 'left-[22px]' : 'left-[2px]'}`}
            />
        </button>
    );
}

function SectionTitle({ children }) {
    return (
        <div className="text-13 uppercase tracking-widest text-accent-cyan font-bold border-b border-[var(--border-subtle)] mb-6 pb-3">
            <Translate>{children}</Translate>
        </div>
    );
}

export default function Settings() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const user = useAppSelector((s) => s.auth.user);
    const theme = useAppSelector((s) => s.theme.theme);
    const googleConnected = useAppSelector((s) => s.auth.googleCalendarConnected);
    const notificationsState = useAppSelector((s) => s.auth.notifications);
    const preferencesState = useAppSelector((s) => s.auth.userPreferences);
    const notificationsEnabled = useAppSelector((s) => s.auth.notificationsEnabled);
    const selectedLanguage = useAppSelector((s) => s.language.selectedLanguage);

    const [activeTab, setActiveTab] = useState('notifications');
    const [notifDraft, setNotifDraft] = useState(notificationsState);
    const [prefDraft, setPrefDraft] = useState(preferencesState);
    const [googleEmail, setGoogleEmail] = useState(user?.googleCalendar?.accountEmail || '');

    const [emailTestStatus, setEmailTestStatus] = useState('idle'); // idle | sending | sent | error
    const [notifSaveStatus, setNotifSaveStatus] = useState('idle'); // idle | saving | saved
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

    const [confirmClearMemory, setConfirmClearMemory] = useState(false);
    const [confirmResetAgents, setConfirmResetAgents] = useState(false);
    const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [translatorInput, setTranslatorInput] = useState('');
    const [translatorOutput, setTranslatorOutput] = useState('');
    const [translatorLoading, setTranslatorLoading] = useState(false);
    const didAutofillEmailRef = useRef(false);

    const activeTabInfo = useMemo(() => TABS.find((t) => t.id === activeTab), [activeTab]);

    const toastSaved = (message) => toast.success(message, { duration: 2000 });
    const toastApiError = (fallback, error) => toast.error(error?.response?.data?.message || fallback, { duration: 2000 });

    useEffect(() => {
        setNotifDraft(notificationsState);
    }, [notificationsState]);

    useEffect(() => {
        if (didAutofillEmailRef.current) return;
        didAutofillEmailRef.current = true;

        const registrationEmail = String(user?.email || '').trim();
        if (!registrationEmail) return;

        if (!String(notificationsState?.emailAddress || '').trim()) {
            setNotifDraft((prev) => ({ ...prev, emailAddress: registrationEmail }));
        }
    }, [notificationsState?.emailAddress, user?.email]);

    useEffect(() => {
        setPrefDraft(preferencesState);
    }, [preferencesState]);

    useEffect(() => {
        const loadGoogle = async () => {
            try {
                const status = await api.getGoogleStatus();
                dispatch(setGoogleCalendarConnected(status.connected === true));
                setGoogleEmail(status.accountEmail || '');
            } catch (_) {
                // keep fallback values
            }
        };
        loadGoogle();
    }, [dispatch]);

    const setNotif = (key, value) => setNotifDraft((p) => ({ ...p, [key]: value }));
    const setPref = (key, value) => setPrefDraft((p) => ({ ...p, [key]: value }));
    const { speak } = useVoiceAgent();

    const runTranslatorPreview = async () => {
        const sourceText = String(translatorInput || '').trim();
        const targetLanguage = selectedLanguage || 'en';
        if (!sourceText) {
            setTranslatorOutput('');
            return;
        }
        if (targetLanguage === 'en') {
            setTranslatorOutput(sourceText);
            return;
        }

        setTranslatorLoading(true);
        try {
            const translated = await api.translate(sourceText, targetLanguage);
            setTranslatorOutput(String(translated || sourceText));
        } catch (error) {
            setTranslatorOutput('');
            toastApiError('Failed to translate preview.', error);
        } finally {
            setTranslatorLoading(false);
        }
    };

    const saveNotifications = async () => {
        try {
            setNotifSaveStatus('saving');

            const payload = {
                emailEnabled: !!notifDraft.emailEnabled,
                emailAddress: String(notifDraft.emailAddress || '').trim() || String(user?.email || '').trim(),
                notifyOnPipelineComplete: !!notifDraft.notifyOnPipelineComplete,
                notifyOnScheduledTask: !!notifDraft.notifyOnScheduledTask,
                notifyOnCalendarCreated: !!notifDraft.notifyOnCalendarCreated,
            };

            const saved = await api.saveNotificationPreferences(payload);
            dispatch(setNotificationsState(saved));
            toastSaved('Notification preferences saved.');

            setNotifSaveStatus('saved');
            setTimeout(() => setNotifSaveStatus('idle'), 1000);
        } catch (error) {
            setNotifSaveStatus('idle');
            toastApiError('Failed to save notifications.', error);
        }
    };

    const savePreferences = async () => {
        try {
            const saved = await api.saveUserPreferences(prefDraft);
            dispatch(setUserPreferencesState(saved));
            toastSaved('Preferences saved.');
        } catch (error) {
            toastApiError('Failed to save preferences.', error);
        }
    };

    useEffect(() => {
        const unregister = registerVoicePageHandlers({
            saveSettings: () => savePreferences(),
        }, () => ({
            settingsTab: activeTab,
        }));

        return unregister;
    }, [activeTab, prefDraft]);

    const testNotification = async () => {
        try {
            setEmailTestStatus('sending');
            const response = await api.sendNotificationTest('email', {
                emailAddress: String(notifDraft.emailAddress || '').trim() || String(user?.email || '').trim(),
            });
            console.log('[Settings] notification test response:', response);

            setEmailTestStatus('sent');
            setTimeout(() => setEmailTestStatus('idle'), 3000);
        } catch (error) {
            setEmailTestStatus('error');
            setTimeout(() => setEmailTestStatus('idle'), 3000);
            toastApiError('Failed to send email test notification.', error);
        }
    };

    const handleNotificationsMasterToggle = async (nextValue) => {
        dispatch(setNotificationsEnabled(nextValue));

        try {
            const payload = {
                emailEnabled: nextValue,
                emailAddress: String(notifDraft.emailAddress || '').trim() || String(user?.email || '').trim(),
                notifyOnPipelineComplete: !!notifDraft.notifyOnPipelineComplete,
                notifyOnScheduledTask: !!notifDraft.notifyOnScheduledTask,
                notifyOnCalendarCreated: !!notifDraft.notifyOnCalendarCreated,
            };
            const saved = await api.saveNotificationPreferences(payload);
            dispatch(setNotificationsState(saved));
            setNotifDraft((prev) => ({ ...prev, emailEnabled: nextValue }));
        } catch (error) {
            dispatch(setNotificationsEnabled(!nextValue));
            toastApiError('Failed to save notification toggle.', error);
        }
    };

    const handleConnectGoogle = async () => {
        try {
            const url = await api.getGoogleAuthUrl();
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (error) {
            toastApiError('Failed to start Google Calendar connection.', error);
        }
    };

    const handleDisconnectGoogle = async () => {
        try {
            await api.disconnectGoogle();
            dispatch(setGoogleCalendarConnected(false));
            setGoogleEmail('');
            toastSaved('Google Calendar disconnected.');
        } catch (error) {
            toastApiError('Failed to disconnect Google Calendar.', error);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error('New password and confirmation do not match.', { duration: 2000 });
            return;
        }

        try {
            await api.changePassword({
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword,
            });
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            toastSaved('Password updated successfully.');
        } catch (error) {
            toastApiError('Failed to update password.', error);
        }
    };

    const handleDeleteAccount = async () => {
        try {
            await api.deleteAccount();
            authService.logout();
            dispatch(logout());
            navigate('/auth');
        } catch (error) {
            toastApiError('Failed to delete account.', error);
        }
    };

    const tabButtonClass = (isActive, danger) =>
        `w-full h-10 px-3 rounded-lg flex items-center gap-2 text-13 border-l-2 transition-colors ${
            isActive
                ? 'border-l-accent-cyan bg-[rgba(0,212,255,0.08)] text-[var(--text-primary)]'
                : `border-l-transparent text-[var(--text-muted)] hover:bg-[var(--glass-bg-hover)] ${danger ? 'hover:text-red-300' : 'hover:text-[var(--text-secondary)]'}`
        } ${danger && !isActive ? 'text-red-400/90' : ''}`;

    return (
        <AppLayout>
            <div className="p-4 md:p-6 2xl:p-10 max-w-7xl mx-auto w-full">
                <div className="md:hidden mb-4 overflow-x-auto scrollbar-thin">
                    <div className="flex items-center gap-2 min-w-max">
                        {TABS.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`h-10 px-3 rounded-lg flex items-center gap-2 border-l-2 transition-colors ${
                                        isActive
                                            ? 'border-l-accent-cyan bg-[rgba(0,212,255,0.08)] text-[var(--text-primary)]'
                                            : `border-l-transparent text-[var(--text-muted)] hover:bg-[var(--glass-bg-hover)] ${tab.danger ? 'hover:text-red-300' : 'hover:text-[var(--text-secondary)]'}`
                                    }`}
                                >
                                    <Icon size={14} />
                                    <span className="text-13 whitespace-nowrap"><Translate>{tab.label}</Translate></span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
                    <aside className="hidden md:block glass-card rounded-xl border border-[var(--border-subtle)] p-3 h-fit">
                        <div className="space-y-1">
                            {TABS.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={tabButtonClass(isActive, tab.danger)}
                                    >
                                        <Icon size={15} />
                                        <span><Translate>{tab.label}</Translate></span>
                                    </button>
                                );
                            })}
                        </div>
                    </aside>

                    <section className="glass-card rounded-xl p-6">
                        <SectionTitle>{activeTabInfo?.label}</SectionTitle>

                        {activeTab === 'notifications' && (
                            <div className="space-y-4">
                                <div className={`glass-card rounded-xl p-4 mb-6 border border-[var(--border-subtle)] border-l-4 border-l-transparent bg-gradient-to-r from-[rgba(0,212,255,0.12)] to-transparent ${notificationsEnabled ? 'shadow-[0_0_20px_rgba(0,212,255,0.08)]' : ''}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Bell size={16} className="text-accent-cyan" />
                                            <div className="text-14 font-semibold text-[var(--text-primary)]"><Translate>Notifications</Translate></div>
                                        </div>
                                        <Toggle checked={notificationsEnabled} onChange={handleNotificationsMasterToggle} />
                                    </div>
                                </div>

                                <div className="relative space-y-4">
                                    {!notificationsEnabled && (
                                        <div className="absolute inset-0 z-10 pointer-events-none bg-black/10 rounded-xl" />
                                    )}

                                    <div className={`glass-card rounded-xl p-5 mb-4 border-l-2 border-l-accent-cyan ${!notificationsEnabled ? 'opacity-40' : ''}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2 text-13 font-semibold">
                                                <Mail size={15} className="text-accent-cyan" />
                                                <span><Translate>Email Notifications</Translate></span>
                                            </div>
                                            <Toggle checked={!!notifDraft.emailEnabled} onChange={(v) => setNotif('emailEnabled', v)} />
                                        </div>

                                        <AnimatePresence initial={false}>
                                            {notifDraft.emailEnabled && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.22, ease: 'easeInOut' }}
                                                    className="overflow-hidden"
                                                >
                                                    <label className="block text-11 uppercase tracking-wider text-[var(--text-muted)] mb-1 mt-2"><Translate>Default Email Address</Translate></label>
                                                    <input
                                                        value={notifDraft.emailAddress || ''}
                                                        onChange={(e) => setNotif('emailAddress', e.target.value)}
                                                        placeholder="your@email.com"
                                                        className={INPUT_CLASS}
                                                    />
                                                    <p className="text-11 text-[var(--text-muted)] mt-2"><Translate>Pipeline results and scheduled digests go here by default.</Translate></p>

                                                    <button
                                                        onClick={testNotification}
                                                        className={`w-full h-9 mt-3 rounded-lg text-13 flex items-center justify-center gap-2 transition-colors ${
                                                            emailTestStatus === 'sent'
                                                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                                                                : emailTestStatus === 'error'
                                                                    ? 'bg-red-500/20 text-red-300 border border-red-400/40'
                                                                    : 'glass-button-primary'
                                                        }`}
                                                        disabled={emailTestStatus === 'sending'}
                                                    >
                                                        {emailTestStatus === 'sending' && <Loader2 size={14} className="animate-spin" />}
                                                        {emailTestStatus === 'sent' && <Check size={14} />}
                                                        {emailTestStatus === 'error' && <X size={14} />}
                                                        <Translate>{emailTestStatus === 'sending'
                                                            ? 'Sending'
                                                            : emailTestStatus === 'sent'
                                                                ? 'Email Sent'
                                                                : emailTestStatus === 'error'
                                                                    ? 'Test Failed'
                                                                    : 'Test Email'}</Translate>
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <div className={`glass-card rounded-xl p-4 border border-[var(--border-subtle)] ${!notificationsEnabled ? 'opacity-40' : ''}`}>
                                    <div className="text-11 uppercase tracking-wider text-[var(--text-muted)] mb-3"><Translate>Notification Triggers</Translate></div>
                                    <div className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)]">
                                        <span className="text-13"><Translate>Pipeline Completed</Translate></span>
                                        <Toggle checked={!!notifDraft.notifyOnPipelineComplete} onChange={(v) => setNotif('notifyOnPipelineComplete', v)} />
                                    </div>
                                    <div className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)]">
                                        <span className="text-13"><Translate>Scheduled Task Fired</Translate></span>
                                        <Toggle checked={!!notifDraft.notifyOnScheduledTask} onChange={(v) => setNotif('notifyOnScheduledTask', v)} />
                                    </div>
                                    <div className="flex items-center justify-between py-2">
                                        <span className="text-13"><Translate>Calendar Events Created</Translate></span>
                                        <Toggle checked={!!notifDraft.notifyOnCalendarCreated} onChange={(v) => setNotif('notifyOnCalendarCreated', v)} />
                                    </div>
                                </div>

                                <button
                                    onClick={saveNotifications}
                                    className={`w-full h-10 mt-4 rounded-lg text-13 flex items-center justify-center gap-2 ${notifSaveStatus === 'saved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40' : 'glass-button-primary'}`}
                                    disabled={notifSaveStatus === 'saving'}
                                >
                                    {notifSaveStatus === 'saving' && <Loader2 size={14} className="animate-spin" />}
                                    {notifSaveStatus === 'saved' && <Check size={14} />}
                                    <Translate>{notifSaveStatus === 'saving' ? 'Saving' : notifSaveStatus === 'saved' ? 'Saved' : 'Save Settings'}</Translate>
                                </button>
                            </div>
                        )}

                        {activeTab === 'integrations' && (
                            <div className="glass-card rounded-xl p-4 mb-4 border-l-2 border-l-blue-400">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <div className="text-13 font-semibold"><Translate>Google Calendar</Translate></div>
                                        <div className="text-12 mt-1 text-[var(--text-secondary)] flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${googleConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                            {googleConnected ? <><Translate>Connected as</Translate> {googleEmail || user?.email || 'Unknown account'}</> : <Translate>Not connected</Translate>}
                                        </div>
                                    </div>
                                    {!googleConnected ? (
                                        <button onClick={handleConnectGoogle} className="glass-button-primary h-9 px-4 text-13"><Translate>Connect</Translate></button>
                                    ) : (
                                        <button onClick={handleDisconnectGoogle} className="h-9 px-4 text-13 rounded-lg border border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-500/10"><Translate>Disconnect</Translate></button>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'profile' && (
                            <div className="space-y-4">
                                <div className="glass-card rounded-xl p-4 border border-[var(--border-subtle)]">
                                    <label className="block text-12 text-[var(--text-muted)] mb-1"><Translate>Name</Translate></label>
                                    <div className="h-10 px-3 rounded-lg border border-[var(--border-subtle)] flex items-center text-13 text-[var(--text-secondary)]">{user?.name || '-'}</div>
                                    <label className="block text-12 text-[var(--text-muted)] mb-1 mt-3"><Translate>Email</Translate></label>
                                    <div className="h-10 px-3 rounded-lg border border-[var(--border-subtle)] flex items-center text-13 text-[var(--text-secondary)]">{user?.email || '-'}</div>
                                </div>

                                <form onSubmit={handleChangePassword} className="glass-card rounded-xl p-4 border border-[var(--border-subtle)] space-y-2">
                                    <div className="text-13 font-semibold mb-1"><Translate>Change Password</Translate></div>
                                    <input type="password" placeholder="Current password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))} className={INPUT_CLASS} />
                                    <input type="password" placeholder="New password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))} className={INPUT_CLASS} />
                                    <input type="password" placeholder="Confirm new password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))} className={INPUT_CLASS} />
                                    <button className="glass-button-primary h-9 px-4 text-13"><Translate>Update Password</Translate></button>
                                </form>
                            </div>
                        )}

                        {activeTab === 'preferences' && (
                            <div className="glass-card rounded-xl p-4 border border-[var(--border-subtle)] space-y-3">
                                <div className="flex items-center justify-between"><span className="text-13"><Translate>Show pipeline recommendations</Translate></span><Toggle checked={!!prefDraft.showPipelineRecommendations} onChange={(v) => setPref('showPipelineRecommendations', v)} /></div>
                                <div className="flex items-center justify-between"><span className="text-13"><Translate>Show email recipient field in task input</Translate></span><Toggle checked={!!prefDraft.showEmailField} onChange={(v) => setPref('showEmailField', v)} /></div>
                                <div className="flex items-center justify-between"><span className="text-13"><Translate>Auto-send results via email</Translate></span><Toggle checked={!!prefDraft.autoSendEmail} onChange={(v) => setPref('autoSendEmail', v)} /></div>
                                <div className="flex items-center justify-between"><span className="text-13"><Translate>Voice enabled by default</Translate></span><Toggle checked={!!prefDraft.voiceEnabledByDefault} onChange={(v) => setPref('voiceEnabledByDefault', v)} /></div>
                                <div className="flex items-center justify-between"><span className="text-13"><Translate>Auto-optimise prompts before pipeline runs</Translate></span><Toggle checked={prefDraft.autoOptimisePrompts !== false} onChange={(v) => setPref('autoOptimisePrompts', v)} /></div>
                                <button onClick={savePreferences} className="glass-button-primary h-9 px-4 text-13 mt-2"><Translate>Save</Translate></button>
                            </div>
                        )}

                        {activeTab === 'voice' && (
                            <div className="glass-card rounded-xl p-4 border border-[var(--border-subtle)] space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-13"><Translate>Enable voice control</Translate></span>
                                    <Toggle checked={!!prefDraft.voiceControlEnabled} onChange={(v) => setPref('voiceControlEnabled', v)} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-13"><Translate>Continuous listening mode</Translate></span>
                                    <Toggle checked={prefDraft.voiceContinuousMode !== false} onChange={(v) => setPref('voiceContinuousMode', v)} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-13"><Translate>Muted by default</Translate></span>
                                    <Toggle checked={!!prefDraft.voiceMuted} onChange={(v) => setPref('voiceMuted', v)} />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-13">
                                        <span><Translate>Speech rate</Translate></span>
                                        <span className="text-[var(--text-muted)]">{(prefDraft.voiceRate ?? 1).toFixed(1)}×</span>
                                    </div>
                                    <input
                                        type="range" min="0.5" max="2" step="0.1"
                                        value={prefDraft.voiceRate ?? 1}
                                        onChange={(e) => setPref('voiceRate', parseFloat(e.target.value))}
                                        className="w-full accent-cyan-400"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-13">
                                        <span><Translate>Speech pitch</Translate></span>
                                        <span className="text-[var(--text-muted)]">{(prefDraft.voicePitch ?? 1).toFixed(1)}</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="2" step="0.1"
                                        value={prefDraft.voicePitch ?? 1}
                                        onChange={(e) => setPref('voicePitch', parseFloat(e.target.value))}
                                        className="w-full accent-cyan-400"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <span className="text-13 block mb-1"><Translate>Recognition language</Translate></span>
                                    <select
                                        value={prefDraft.voiceRecognitionLanguage ?? 'en-US'}
                                        onChange={(e) => setPref('voiceRecognitionLanguage', e.target.value)}
                                        className="glass-input h-9 text-13 rounded-lg border border-[var(--border-subtle)] px-3 w-full bg-transparent text-[var(--text-primary)]"
                                    >
                                        <option value="en-US">English (US)</option>
                                        <option value="en-GB">English (UK)</option>
                                        <option value="en-IN">English (India)</option>
                                        <option value="hi-IN">Hindi</option>
                                        <option value="es-ES">Spanish</option>
                                        <option value="fr-FR">French</option>
                                        <option value="de-DE">German</option>
                                        <option value="ja-JP">Japanese</option>
                                        <option value="zh-CN">Chinese (Simplified)</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-3 pt-2">
                                    <button
                                        onClick={() => speak('Testing voice output. AgentForge voice is ready.', { rate: prefDraft.voiceRate ?? 1, pitch: prefDraft.voicePitch ?? 1 })}
                                        className="glass-button h-9 px-4 text-13 flex items-center gap-2"
                                    >
                                        <Volume2 size={14} /> <Translate>Test voice</Translate>
                                    </button>
                                    <button onClick={savePreferences} className="glass-button-primary h-9 px-4 text-13"><Translate>Save</Translate></button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'appearance' && (
                            <div className="space-y-4">
                                <div className="glass-card rounded-xl p-4 border border-[var(--border-subtle)] flex items-center justify-between">
                                    <span className="text-13"><Translate>Theme</Translate> ({theme})</span>
                                    <button onClick={() => dispatch(toggleTheme())} className="glass-button-primary h-9 px-4 text-13"><Translate>Toggle Theme</Translate></button>
                                </div>
                                <div className="glass-card rounded-xl p-4 border border-[var(--border-subtle)] flex items-center justify-between">
                                    <span className="text-13"><Translate>Language</Translate></span>
                                    <LanguageSelector />
                                </div>
                                <div className="glass-card rounded-xl p-4 border border-[var(--border-subtle)] space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-13 font-semibold"><Translate>Translator</Translate></div>
                                            <p className="text-12 text-[var(--text-muted)]">
                                                <Translate>Quickly preview text translation to</Translate> <span className="font-semibold text-[var(--text-primary)]">{(selectedLanguage || 'en').toUpperCase()}</span>.
                                            </p>
                                        </div>
                                        <button
                                            onClick={runTranslatorPreview}
                                            disabled={translatorLoading || !translatorInput.trim()}
                                            className="glass-button h-9 px-4 text-13 disabled:opacity-50"
                                        >
                                            <Translate>{translatorLoading ? 'Translating...' : 'Translate'}</Translate>
                                        </button>
                                    </div>
                                    <textarea
                                        value={translatorInput}
                                        onChange={(e) => setTranslatorInput(e.target.value)}
                                        placeholder="Type text to translate"
                                        className="w-full min-h-[88px] rounded-lg border border-[var(--border-subtle)] bg-transparent p-3 text-13 text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-cyan-400/50"
                                    />
                                    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--glass-bg)]/30 p-3 min-h-[74px] text-13 text-[var(--text-primary)] whitespace-pre-wrap">
                                        {translatorOutput ? translatorOutput : <Translate>Translation preview appears here.</Translate>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'danger' && (
                            <div className="space-y-4">
                                <div className="glass-card rounded-xl p-4 border border-red-500/20 bg-[rgba(239,68,68,0.03)]">
                                    <div className="text-13 font-semibold text-red-300"><Translate>Clear Agent Memory</Translate></div>
                                    <p className="text-12 text-[var(--text-muted)] mt-1"><Translate>This removes all stored memory entries for your agents.</Translate></p>
                                    {!confirmClearMemory ? (
                                        <button onClick={() => setConfirmClearMemory(true)} className="mt-3 h-9 px-4 text-13 rounded-lg border border-red-500/30 text-red-400"><Translate>Confirm</Translate></button>
                                    ) : (
                                        <div className="mt-3 flex items-center gap-2">
                                            <button onClick={async () => { try { await api.clearAgentMemory(); setConfirmClearMemory(false); toastSaved('Agent memory cleared.'); } catch (error) { toastApiError('Failed to clear memory.', error); } }} className="h-9 px-4 text-13 rounded-lg border border-red-500/30 text-red-400"><Translate>Yes, clear</Translate></button>
                                            <button onClick={() => setConfirmClearMemory(false)} className="h-9 px-4 text-13 rounded-lg border border-[var(--border-subtle)]"><Translate>Cancel</Translate></button>
                                        </div>
                                    )}
                                </div>

                                <div className="glass-card rounded-xl p-4 border border-red-500/20 bg-[rgba(239,68,68,0.03)]">
                                    <div className="text-13 font-semibold text-red-300"><Translate>Reset Agents to Default</Translate></div>
                                    <p className="text-12 text-[var(--text-muted)] mt-1"><Translate>Your custom agents will be removed and defaults restored.</Translate></p>
                                    {!confirmResetAgents ? (
                                        <button onClick={() => setConfirmResetAgents(true)} className="mt-3 h-9 px-4 text-13 rounded-lg border border-red-500/30 text-red-400"><Translate>Confirm</Translate></button>
                                    ) : (
                                        <div className="mt-3 flex items-center gap-2">
                                            <button onClick={async () => { try { const res = await api.resetAgentsToDefault(); if (res?.agents) dispatch(setAgents(res.agents)); setConfirmResetAgents(false); toastSaved('Agents reset to default.'); } catch (error) { toastApiError('Failed to reset agents.', error); } }} className="h-9 px-4 text-13 rounded-lg border border-red-500/30 text-red-400"><Translate>Yes, reset</Translate></button>
                                            <button onClick={() => setConfirmResetAgents(false)} className="h-9 px-4 text-13 rounded-lg border border-[var(--border-subtle)]"><Translate>Cancel</Translate></button>
                                        </div>
                                    )}
                                </div>

                                <div className="glass-card rounded-xl p-4 border border-red-500/20 bg-[rgba(239,68,68,0.03)]">
                                    <div className="text-13 font-semibold text-red-300"><Translate>Delete Account</Translate></div>
                                    <p className="text-12 text-[var(--text-muted)] mt-1"><Translate>This action is permanent and removes your data.</Translate></p>
                                    {!confirmDeleteAccount ? (
                                        <button onClick={() => setConfirmDeleteAccount(true)} className="mt-3 h-9 px-4 text-13 rounded-lg border border-red-500/30 text-red-400"><Translate>Confirm</Translate></button>
                                    ) : (
                                        <div className="mt-3 space-y-2">
                                            <input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="Type DELETE to confirm" className={INPUT_CLASS} />
                                            <div className="flex items-center gap-2">
                                                <button disabled={deleteConfirmText !== 'DELETE'} onClick={handleDeleteAccount} className="h-9 px-4 text-13 rounded-lg border border-red-500/30 text-red-400 disabled:opacity-50"><Translate>Delete Account</Translate></button>
                                                <button onClick={() => { setConfirmDeleteAccount(false); setDeleteConfirmText(''); }} className="h-9 px-4 text-13 rounded-lg border border-[var(--border-subtle)]"><Translate>Cancel</Translate></button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </div>

        </AppLayout>
    );
}
