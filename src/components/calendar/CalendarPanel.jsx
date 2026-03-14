import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import { setCalendarPanelOpen } from '../../store/authSlice';
import * as api from '../../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

function getEventDate(event) {
    const raw = event?.start?.dateTime || event?.start?.date;
    if (!raw) return null;
    return new Date(raw);
}

function formatDateHeading(date) {
    if (!date) return 'Unknown Date';

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(todayStart.getDate() + 1);

    const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (dateStart.getTime() === todayStart.getTime()) return 'Today';
    if (dateStart.getTime() === tomorrowStart.getTime()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });
}

function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}

function formatEventTimeRange(event) {
    const startRaw = event?.start?.dateTime || event?.start?.date;
    const endRaw = event?.end?.dateTime || event?.end?.date;

    if (!startRaw || !endRaw) return 'Time unavailable';

    if (event?.start?.date && event?.end?.date) {
        return 'All day';
    }

    const start = new Date(startRaw);
    const end = new Date(endRaw);
    const startText = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const endText = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${startText} - ${endText}`;
}

export default function CalendarPanel({ onClose }) {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const googleCalendarConnected = useAppSelector((state) => state.auth.googleCalendarConnected);
    const [loading, setLoading] = useState(false);
    const [events, setEvents] = useState([]);
    const [accountEmail, setAccountEmail] = useState('');
    const [selectedDayIndex, setSelectedDayIndex] = useState(0);
    const [touchStartX, setTouchStartX] = useState(null);

    const fetchEvents = async () => {
        if (!googleCalendarConnected) {
            setEvents([]);
            return;
        }

        setLoading(true);
        try {
            const status = await api.getGoogleStatus();
            setAccountEmail(status?.accountEmail || '');

            const data = await api.getCalendarEvents();
            setEvents(Array.isArray(data) ? data : []);
        } catch (error) {
            toast.error('Failed to load calendar events.');
            setEvents([]);
            setAccountEmail('');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, [googleCalendarConnected]);

    const sevenDays = useMemo(() => {
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        return Array.from({ length: 7 }, (_, idx) => {
            const d = new Date(todayStart);
            d.setDate(todayStart.getDate() + idx);
            return d;
        });
    }, []);

    const eventsByDay = useMemo(() => {
        const map = new Map();
        sevenDays.forEach((d, idx) => {
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            map.set(key, { index: idx, date: d, events: [] });
        });

        for (const event of events) {
            const eventDate = getEventDate(event);
            if (!eventDate) continue;

            const eventStart = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
            const key = `${eventStart.getFullYear()}-${eventStart.getMonth()}-${eventStart.getDate()}`;
            if (map.has(key)) {
                map.get(key).events.push(event);
            }
        }

        return map;
    }, [events, sevenDays]);

    const selectedDay = sevenDays[selectedDayIndex] || sevenDays[0];
    const selectedKey = `${selectedDay.getFullYear()}-${selectedDay.getMonth()}-${selectedDay.getDate()}`;
    const selectedDayEvents = eventsByDay.get(selectedKey)?.events || [];

    const navigateDay = (delta) => {
        setSelectedDayIndex((prev) => {
            const next = prev + delta;
            if (next < 0) return 0;
            if (next > 6) return 6;
            return next;
        });
    };

    const onTouchStart = (e) => {
        setTouchStartX(e.changedTouches?.[0]?.clientX ?? null);
    };

    const onTouchEnd = (e) => {
        if (touchStartX == null) return;

        const endX = e.changedTouches?.[0]?.clientX;
        if (typeof endX !== 'number') return;

        const delta = endX - touchStartX;
        if (Math.abs(delta) < 40) return;

        if (delta < 0) {
            navigateDay(1);
        } else {
            navigateDay(-1);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
            <motion.aside
                initial={{ x: 400 }}
                animate={{ x: 0 }}
                exit={{ x: 400 }}
                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                className="fixed right-0 top-0 h-full w-full sm:w-[440px] z-50 p-4"
            >
                <div className="glass-card h-full rounded-2xl border border-[var(--border-default)] p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">📅</span>
                            <h2 className="text-sm uppercase tracking-widest text-[var(--text-primary)] font-bold">My Calendar</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg glass-button-secondary flex items-center justify-center"
                            title="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {googleCalendarConnected && (
                        <div className="mb-3 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span>Connected as</span>
                            <span className="text-[var(--text-muted)] truncate">{accountEmail || 'Unknown account'}</span>
                        </div>
                    )}

                    {!googleCalendarConnected ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
                            <div className="text-4xl opacity-70">📅</div>
                            <p className="text-sm text-[var(--text-secondary)]">Google Calendar is not connected.</p>
                            <button
                                onClick={() => {
                                    dispatch(setCalendarPanelOpen(false));
                                    navigate('/settings');
                                }}
                                className="h-[34px] px-4 rounded-lg border border-[var(--border-default)] bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] text-12 font-medium"
                            >
                                Open Settings
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="mb-3 flex items-center gap-2">
                                <button
                                    onClick={() => navigateDay(-1)}
                                    disabled={selectedDayIndex === 0}
                                    className="w-7 h-7 rounded-md border border-[var(--border-default)] disabled:opacity-40 flex items-center justify-center"
                                    title="Previous day"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>

                                <div className="flex-1 grid grid-cols-7 gap-1">
                                    {sevenDays.map((day, idx) => {
                                        const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
                                        const dayEvents = eventsByDay.get(key)?.events || [];
                                        const hasEvents = dayEvents.length > 0;
                                        const isToday = idx === 0;
                                        const isSelected = idx === selectedDayIndex;

                                        return (
                                            <button
                                                key={key}
                                                onClick={() => setSelectedDayIndex(idx)}
                                                className={`rounded-lg px-1 py-1.5 text-center border transition-all ${isToday
                                                        ? 'bg-[var(--cyan)]/20 border-[var(--cyan)] shadow-[0_0_10px_rgba(0,212,255,0.35)]'
                                                        : 'border-[var(--border-default)] bg-[var(--glass-bg)]'} ${isSelected ? 'ring-1 ring-[var(--cyan)]' : ''}`}
                                            >
                                                <div className="text-[10px] text-[var(--text-secondary)] leading-tight">
                                                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                                                </div>
                                                <div className="text-xs font-semibold text-[var(--text-primary)] leading-tight mt-0.5">
                                                    {day.getDate()}
                                                </div>
                                                <div className="h-2 flex items-center justify-center mt-0.5">
                                                    {hasEvents && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() => navigateDay(1)}
                                    disabled={selectedDayIndex === 6}
                                    className="w-7 h-7 rounded-md border border-[var(--border-default)] disabled:opacity-40 flex items-center justify-center"
                                    title="Next day"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>

                            <div
                                className="flex-1 overflow-y-auto pr-1 scrollbar-thin"
                                onTouchStart={onTouchStart}
                                onTouchEnd={onTouchEnd}
                            >
                                {loading ? (
                                    <div className="h-full flex items-center justify-center">
                                        <div className="w-6 h-6 border-2 border-[var(--cyan)] border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : selectedDayEvents.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center gap-2">
                                        <div className="text-4xl opacity-70">📅</div>
                                        {selectedDayIndex === 0 ? (
                                            <>
                                                <p className="text-sm text-[var(--text-secondary)]">No tasks scheduled for today.</p>
                                                <p className="text-xs text-[var(--text-muted)]">Run a pipeline with Sage to add tasks.</p>
                                            </>
                                        ) : (
                                            <p className="text-sm text-[var(--text-secondary)]">No tasks scheduled for this day.</p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">
                                                {formatDateHeading(selectedDay)}
                                            </h4>
                                            <p className="text-xs text-[var(--text-muted)] mb-2">
                                                {selectedDayEvents.length} task{selectedDayEvents.length !== 1 ? 's' : ''} scheduled
                                            </p>
                                            <div className="space-y-2">
                                                {selectedDayEvents.map((event) => (
                                                    <div key={event.id} className="glass-card rounded-lg p-3 border border-[var(--border-subtle)] border-l-2 border-l-[var(--cyan)]">
                                                        <div className="text-sm font-semibold text-[var(--text-primary)]">
                                                            {(event.summary || 'Untitled event').trim()}
                                                        </div>
                                                        {event.description && (
                                                            <div className="text-xs text-[var(--text-muted)] mt-1 whitespace-pre-wrap">
                                                                {event.description}
                                                            </div>
                                                        )}
                                                        <div className="text-xs text-[var(--text-secondary)] mt-1">
                                                            {formatEventTimeRange(event)}
                                                        </div>
                                                        {event.htmlLink && (
                                                            <a
                                                                href={event.htmlLink}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-block mt-2 text-xs text-[var(--cyan)] hover:underline"
                                                            >
                                                                Open in Google Calendar
                                                            </a>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={fetchEvents}
                                className="mt-4 h-[34px] rounded-lg border border-[var(--border-default)] bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] text-12 font-medium"
                                disabled={loading}
                            >
                                Refresh
                            </button>
                        </>
                    )}
                </div>
            </motion.aside>
        </>
    );
}
