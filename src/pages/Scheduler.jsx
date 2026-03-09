import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../store';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Clock, Plus, Trash2, Mail, Activity, LayoutDashboard, ArrowLeft } from 'lucide-react';

const QUICK_PRESETS = [
    { label: 'Daily 9 AM', cron: '0 9 * * *', display: 'Every day at 9:00 AM' },
    { label: 'Daily 6 PM', cron: '0 18 * * *', display: 'Every day at 6:00 PM' },
    { label: 'Every Monday 8 AM', cron: '0 8 * * 1', display: 'Every Monday at 8:00 AM' },
    { label: 'Every Hour', cron: '0 * * * *', display: 'Every hour' },
];

function humanCron(cron) {
    const map = {
        '0 9 * * *': 'Every day at 9 AM',
        '0 18 * * *': 'Every day at 6 PM',
        '0 8 * * 1': 'Every Monday at 8 AM',
        '0 * * * *': 'Every hour',
    };
    return map[cron] || cron;
}

export default function Scheduler() {
    const navigate = useNavigate();
    const agents = useAppSelector(state => state.agents.agents);
    const userId = useAppSelector(state => state.auth.user?.id);

    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form state
    const [task, setTask] = useState('');
    const [agentId, setAgentId] = useState('');
    const [email, setEmail] = useState('');
    const [cron, setCron] = useState('0 9 * * *');
    const [customCron, setCustomCron] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const activeCron = customCron.trim() || cron;

    useEffect(() => {
        fetchSchedules();
    }, []);

    async function fetchSchedules() {
        try {
            const { data } = await api.get('/api/user/schedules');
            setSchedules(data.schedules || []);
        } catch (err) {
            console.error('Failed to load schedules:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!task.trim()) return toast.error('Task description is required');
        if (!email.trim()) return toast.error('Recipient email is required');

        setSubmitting(true);
        try {
            const { data } = await api.post('/api/tools/scheduler', {
                taskDescription: task,
                cronExpression: activeCron,
                recipientEmail: email,
                agentId: agentId || agents[0]?.id,
                userId,
            });

            toast.success(`✅ Schedule created! Runs: ${data.humanReadableTime}`);
            setTask('');
            setEmail('');
            setCustomCron('');
            fetchSchedules();
        } catch (err) {
            toast.error('Failed to create schedule');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(id) {
        try {
            await api.delete(`/api/user/schedules/${id}`);
            setSchedules(s => s.filter(x => x._id !== id));
            toast.success('Schedule deleted');
        } catch (err) {
            toast.error('Failed to delete schedule');
        }
    }

    return (
        <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
            {/* Header */}
            <div className="h-16 glass-header sticky top-0 z-50 flex items-center px-6 gap-4">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
                >
                    <ArrowLeft size={18} />
                    <span className="text-sm">Dashboard</span>
                </button>
                <div className="w-px h-5 bg-white/10" />
                <Clock size={18} className="text-[#f97316]" />
                <h1 className="text-base font-semibold">Scheduler</h1>
                <span className="text-xs text-[var(--text-muted)] ml-auto">
                    {schedules.length} active schedule{schedules.length !== 1 ? 's' : ''}
                </span>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* LEFT — Existing Schedules */}
                <div>
                    <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--text-secondary)] mb-4">
                        Active Schedules
                    </h2>

                    {loading && (
                        <div className="glass-card p-8 flex items-center justify-center text-[var(--text-muted)]">
                            <div className="flex gap-2 items-center">
                                <div className="w-3 h-3 bg-[#f97316] rounded-full animate-pulse" />
                                Loading...
                            </div>
                        </div>
                    )}

                    {!loading && schedules.length === 0 && (
                        <div className="glass-card p-10 flex flex-col items-center gap-3 text-center">
                            <Clock size={32} className="text-[var(--text-muted)] opacity-40" />
                            <p className="text-[var(--text-muted)] text-sm">No schedules yet.</p>
                            <p className="text-[var(--text-muted)] text-xs opacity-60">
                                Create one using the form.
                            </p>
                        </div>
                    )}

                    <div className="flex flex-col gap-3">
                        {schedules.map(s => {
                            const agent = agents.find(a => a.id === s.agentIds?.[0] || a._id === s.agentIds?.[0]);
                            return (
                                <div
                                    key={s._id}
                                    className="glass-card p-4 flex flex-col gap-3 group"
                                    style={{ borderLeft: `3px solid ${agent?.color || '#f97316'}` }}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                                                {s.name || s.taskGoal}
                                            </p>
                                            {agent && (
                                                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                                    Agent: <span style={{ color: agent.color }}>{agent.name}</span>
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleDelete(s._id)}
                                            className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center
                                                       text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10
                                                       opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    <div className="flex flex-wrap gap-2 items-center">
                                        <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                                            <Clock size={11} />
                                            {humanCron(s.cronExpression)}
                                        </span>
                                        {s.email && (
                                            <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                                                <Mail size={11} />
                                                {s.email}
                                            </span>
                                        )}
                                        <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.isActive
                                                ? 'bg-emerald-500/15 text-emerald-400'
                                                : 'bg-red-500/15 text-red-400'
                                            }`}>
                                            {s.isActive ? 'ACTIVE' : 'PAUSED'}
                                        </span>
                                    </div>

                                    {s.runCount > 0 && (
                                        <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                                            <Activity size={9} />
                                            Run {s.runCount} time{s.runCount !== 1 ? 's' : ''}
                                            {s.lastRunAt && ` · Last: ${new Date(s.lastRunAt).toLocaleString()}`}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT — New Schedule Form */}
                <div>
                    <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--text-secondary)] mb-4 flex items-center gap-2">
                        <Plus size={14} />
                        New Schedule
                    </h2>

                    <form onSubmit={handleSubmit} className="glass-card p-6 flex flex-col gap-5">
                        {/* Task description */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                                Task Description
                            </label>
                            <textarea
                                value={task}
                                onChange={e => setTask(e.target.value)}
                                placeholder="Fetch top tech news headlines and summarize them"
                                rows={3}
                                className="w-full glass-card resize-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#f97316]/50"
                            />
                        </div>

                        {/* Agent selector */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                                Agent
                            </label>
                            <select
                                value={agentId}
                                onChange={e => setAgentId(e.target.value)}
                                className="w-full glass-card text-sm text-[var(--text-primary)] p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#f97316]/50 bg-transparent"
                            >
                                <option value="">Auto-select (first agent)</option>
                                {agents.map(a => (
                                    <option key={a.id || a._id} value={a.id || a._id}>
                                        {a.name} — {a.role}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Recipient email */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                                Recipient Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full glass-card text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#f97316]/50"
                            />
                        </div>

                        {/* Schedule presets */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                                Frequency
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {QUICK_PRESETS.map(p => (
                                    <button
                                        key={p.cron}
                                        type="button"
                                        onClick={() => { setCron(p.cron); setCustomCron(''); }}
                                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${cron === p.cron && !customCron
                                                ? 'border-[#f97316] bg-[#f97316]/15 text-[#f97316]'
                                                : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-white/20 hover:text-white'
                                            }`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom cron */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                                Custom Cron <span className="normal-case opacity-60">(overrides preset)</span>
                            </label>
                            <input
                                type="text"
                                value={customCron}
                                onChange={e => setCustomCron(e.target.value)}
                                placeholder="e.g. 0 9 * * 1-5  (weekdays at 9 AM)"
                                className="w-full glass-card text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#f97316]/50 font-mono"
                            />
                        </div>

                        {/* Active cron preview */}
                        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] px-3 py-2 rounded-lg bg-[#f97316]/8">
                            <Clock size={12} className="text-[#f97316]" />
                            <span>Will run: <span className="text-[#f97316] font-medium">{humanCron(activeCron)}</span></span>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-3 rounded-xl bg-[#f97316] text-white text-sm font-semibold
                                       hover:bg-[#f97316]/90 active:scale-95 transition-all disabled:opacity-50
                                       flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {submitting ? (
                                <span className="flex gap-2 items-center">
                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Scheduling...
                                </span>
                            ) : (
                                <>
                                    <Clock size={16} />
                                    Schedule It
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
