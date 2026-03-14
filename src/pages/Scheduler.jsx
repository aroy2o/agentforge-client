import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAppSelector } from '../store';
import { formatDistanceToNow, format, isTomorrow } from 'date-fns';
import AppLayout from '../components/layout/AppLayout';
import Translate from '../components/layout/Translate';
import { useTranslatedText } from '../hooks/useTranslatedText';
import {
    getSchedules,
    createSchedule,
    deleteSchedule,
    pauseSchedule,
    runScheduleNow,
    parseScheduleTime,
} from '../services/api';
import toast from 'react-hot-toast';
import { Clock, Plus, Trash2, Mail, Activity, X, ArrowRight, Workflow, AlertTriangle } from 'lucide-react';
import { detectPipeline } from '../utils/detectPipeline';
import { registerVoicePageHandlers } from '../utils/voicePageHandlers';
import { speak as browserSpeak } from '../utils/speak';
import { extractEmail } from '../utils/normaliseTranscript';
import { defaultAgents } from '../constants/defaultAgents';

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
    const agents = useAppSelector((state) => state.agents.agents);
    const userPreferences = useAppSelector((state) => state.auth.userPreferences);

    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);

    const [task, setTask] = useState('');
    const [email, setEmail] = useState('');
    const [timeInput, setTimeInput] = useState('Every day at 9:00 AM');
    const [parsedCron, setParsedCron] = useState('0 9 * * *');
    const [parsedHumanReadable, setParsedHumanReadable] = useState('Every day at 9:00 AM');
    const [parsedNextRunAt, setParsedNextRunAt] = useState(null);
    const [parseConfidence, setParseConfidence] = useState(1);
    const [parseClarification, setParseClarification] = useState(null);
    const [clarificationInput, setClarificationInput] = useState('');
    const [isParsingTime, setIsParsingTime] = useState(false);
    const [parseError, setParseError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [runningNow, setRunningNow] = useState({});
    const [togglingActive, setTogglingActive] = useState({});

    // Pipeline builder state
    const [pipeline, setPipeline] = useState([]);
    const [showAddAgentMenu, setShowAddAgentMenu] = useState(false);
    const [suggestion, setSuggestion] = useState(null);

    const agentsForDetection = useMemo(
        () => agents.map((a) => ({ ...a, id: a.id || a._id })),
        [agents]
    );
    const availableAgents = useMemo(
        () => (Array.isArray(agents) && agents.length > 0 ? agents : defaultAgents),
        [agents]
    );
    const taskRef = useRef(task);
    const pipelineRef = useRef(pipeline);
    const parsedCronRef = useRef(parsedCron);
    const pendingVoicePipelineRef = useRef(null);

    // Translated placeholders
    const taskPlaceholder = useTranslatedText('Fetch top tech news headlines and summarize them');
    const emailPlaceholder = useTranslatedText('you@example.com');
    const timePlaceholder = useTranslatedText('e.g. "daily at 10:30am", "every alternative day at 9am", "every Monday at 9am", "every 2 hours"');
    const clarifyPlaceholder = useTranslatedText('Add clarification');

    useEffect(() => {
        taskRef.current = task;
    }, [task]);

    useEffect(() => {
        pipelineRef.current = pipeline;
    }, [pipeline]);

    useEffect(() => {
        parsedCronRef.current = parsedCron;
    }, [parsedCron]);

    useEffect(() => {
        if (!pendingVoicePipelineRef.current || !Array.isArray(availableAgents) || availableAgents.length === 0) return;

        console.log('AVAILABLE AGENTS FOR MAPPING:', availableAgents);
        const mappedPipeline = pendingVoicePipelineRef.current
            .map((name) => {
                const agent = availableAgents.find((a) => String(a.name || '').toLowerCase() === String(name || '').toLowerCase().trim());
                if (!agent) {
                    console.warn('[Scheduler] Voice suggested agent not found:', name);
                    return null;
                }
                return {
                    agentId: String(agent.id || agent._id),
                    agentName: agent.name,
                    agentColor: agent.color || '#f97316',
                };
            })
            .filter(Boolean);

        if (mappedPipeline.length > 0) {
            setPipeline(mappedPipeline);
            console.log('PIPELINE OBJECTS SET:', mappedPipeline);
        }

        pendingVoicePipelineRef.current = null;
    }, [availableAgents]);

    useEffect(() => {
        if (!timeInput.trim()) {
            setParsedCron('');
            setParsedHumanReadable('');
            setParsedNextRunAt(null);
            setParseConfidence(0);
            setParseClarification(null);
            setParseError('');
            return;
        }

        const timer = setTimeout(() => {
            handleParseTime(timeInput);
        }, 600);

        return () => clearTimeout(timer);
    }, [timeInput]);

    useEffect(() => {
        fetchSchedules();
    }, []);

    const isValidEmail = (value) => /[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/.test(String(value || '').trim());

    useEffect(() => {
        if (!userPreferences?.showPipelineRecommendations) {
            setSuggestion(null);
            return;
        }

        if (pipeline.length > 0) {
            setSuggestion(null);
            return;
        }

        const timer = setTimeout(() => {
            if (task.length > 15) {
                setSuggestion(detectPipeline(task, agentsForDetection));
            } else {
                setSuggestion(null);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [task, pipeline.length, agentsForDetection, userPreferences?.showPipelineRecommendations]);

    async function fetchSchedules() {
        try {
            const data = await getSchedules();
            setSchedules(data || []);
        } catch (err) {
            console.error('Failed to load schedules:', err);
        } finally {
            setLoading(false);
        }
    }

    function appendPipelineAgent(agent) {
        const id = agent.id || agent._id;
        if (!id) return;
        setPipeline((prev) => [
            ...prev,
            {
                agentId: String(id),
                agentName: agent.name,
                agentColor: agent.color || '#f97316',
            },
        ]);
        setSuggestion(null);
        setShowAddAgentMenu(false);
    }

    function removePipelineSlot(index) {
        setPipeline((prev) => prev.filter((_, i) => i !== index));
        setSuggestion(null);
    }

    function usePipeline() {
        if (suggestion && suggestion.agents && suggestion.agents.length > 0) {
            const nextPipeline = suggestion.agents
                .map((id) => agents.find((a) => String(a.id || a._id) === String(id)))
                .filter(Boolean)
                .map((agent) => ({
                    agentId: String(agent.id || agent._id),
                    agentName: agent.name,
                    agentColor: agent.color || '#f97316',
                }));

            setPipeline(nextPipeline);
            toast.success(`Pipeline ready: ${suggestion.label}`);
            setSuggestion(null);
        }
    }

    async function handleParseTime(inputValue) {
        const raw = String(inputValue || '').trim();
        if (!raw) return;

        setIsParsingTime(true);
        setParseError('');
        try {
            const result = await parseScheduleTime(raw);
            setParsedCron(result?.cronExpression || '');
            setParsedHumanReadable(result?.humanReadable || '');
            setParsedNextRunAt(result?.nextRunAt || null);
            setParseConfidence(Number(result?.confidence ?? 0));
            setParseClarification(result?.clarification || null);

            if (!result?.cronExpression || Number(result?.confidence ?? 0) < 0.5) {
                setParseError("Could not understand this time format - try something like 'daily at 9am'.");
            }
        } catch {
            setParsedCron('');
            setParsedHumanReadable('');
            setParsedNextRunAt(null);
            setParseConfidence(0);
            setParseClarification(null);
            setParseError("Could not understand this time format - try something like 'daily at 9am'.");
        } finally {
            setIsParsingTime(false);
        }
    }

    async function handlePresetClick(preset) {
        setTimeInput(preset.display);
        await handleParseTime(preset.display);
    }

    async function handleClarificationSubmit() {
        const extra = clarificationInput.trim();
        if (!extra) return;
        const combined = `${timeInput}. Clarification: ${extra}`;
        setTimeInput(combined);
        await handleParseTime(combined);
    }

    const submitSchedule = useCallback(async ({
        taskValue,
        emailValue,
        cronValue,
        humanReadableValue,
        nextRunAtValue,
        pipelineValue,
    }) => {
        const effectivePipeline = Array.isArray(pipelineValue) ? pipelineValue : pipeline;

        if (!String(taskValue || '').trim()) {
            toast.error('Task description is required');
            return null;
        }
        if (!String(emailValue || '').trim()) {
            toast.error('Recipient email is required');
            return null;
        }
        if (!Array.isArray(effectivePipeline) || effectivePipeline.length === 0) {
            toast.error('Add at least one agent.');
            return null;
        }
        if (!String(cronValue || '').trim()) {
            toast.error('Please enter a valid schedule time.');
            return null;
        }

        setSubmitting(true);
        try {
            const data = await createSchedule({
                taskDescription: String(taskValue || '').trim(),
                cronExpression: String(cronValue || '').trim(),
                humanReadableFrequency: String(humanReadableValue || '').trim(),
                nextRunAt: nextRunAtValue || null,
                recipientEmail: String(emailValue || '').trim(),
                pipeline: effectivePipeline,
                // backward compatibility
                agentId: effectivePipeline[0]?.agentId,
            });

            toast.success(`Schedule created! Runs: ${data.humanReadableTime}`);
            setTask('');
            setEmail('');
            setTimeInput('Every day at 9:00 AM');
            setParsedCron('0 9 * * *');
            setParsedHumanReadable('Every day at 9:00 AM');
            setParsedNextRunAt(null);
            setParseConfidence(1);
            setParseClarification(null);
            setClarificationInput('');
            setParseError('');
            setPipeline([]);
            fetchSchedules();
            return data;
        } catch (err) {
            toast.error('Failed to create schedule');
            return null;
        } finally {
            setSubmitting(false);
        }
    }, [pipeline]);

    async function handleSubmit(e) {
        e.preventDefault();
        await submitSchedule({
            taskValue: task,
            emailValue: email,
            cronValue: parsedCron,
            humanReadableValue: parsedHumanReadable,
            nextRunAtValue: parsedNextRunAt,
            pipelineValue: pipeline,
        });
    }

    const voiceFillAndSubmit = useCallback(async (voiceTask, voiceFrequency, voiceEmail, suggestedPipeline) => {
        try {
            const nextTask = String(voiceTask || '').trim();
            const frequencyInput = String(voiceFrequency || '').trim() || 'Every day at 9:00 AM';
            if (!nextTask) {
                await browserSpeak('Schedule creation failed. Please check the scheduler page and try manually.');
                return { success: false, emailValid: false, task: nextTask, frequency: frequencyInput, email: '' };
            }

            setTask(nextTask);

            let effectivePipelineForSubmit = Array.isArray(pipelineRef.current) ? pipelineRef.current : [];

            if (Array.isArray(suggestedPipeline) && suggestedPipeline.length > 0) {
                console.log('VOICE FILL - setting pipeline:', suggestedPipeline);
                console.log('AVAILABLE AGENTS FOR MAPPING:', availableAgents);
                const mappedPipeline = suggestedPipeline
                    .map((name) => {
                        const agent = availableAgents.find((a) => String(a.name || '').toLowerCase() === String(name || '').toLowerCase().trim());
                        if (!agent) {
                            console.warn('[Scheduler] Voice suggested agent not found:', name);
                            return null;
                        }
                        return {
                            agentId: String(agent.id || agent._id),
                            agentName: agent.name,
                            agentColor: agent.color || '#f97316',
                        };
                    })
                    .filter(Boolean);

                if (mappedPipeline.length > 0) {
                    setPipeline(mappedPipeline);
                    effectivePipelineForSubmit = mappedPipeline;
                    console.log('PIPELINE OBJECTS SET:', mappedPipeline);
                } else {
                    pendingVoicePipelineRef.current = [...suggestedPipeline];
                }
            }

            setTimeInput(frequencyInput);

            const parsed = await parseScheduleTime(frequencyInput);
            const nextCron = String(parsed?.cronExpression || '').trim();
            const nextHuman = String(parsed?.humanReadable || frequencyInput).trim();
            const nextRunAt = parsed?.nextRunAt || null;

            setParsedCron(nextCron);
            setParsedHumanReadable(nextHuman);
            setParsedNextRunAt(nextRunAt);
            setParseConfidence(Number(parsed?.confidence ?? 0));
            setParseClarification(parsed?.clarification || null);
            setParseError(nextCron ? '' : "Could not understand this time format - try something like 'daily at 9am'.");

            const rawVoiceEmail = String(voiceEmail || '').trim();
            const extractedEmail = extractEmail(rawVoiceEmail);
            console.log('EMAIL AFTER EXTRACTION:', extractedEmail);

            let nextEmail = '';
            let finalEmailValid = false;

            if (!rawVoiceEmail) {
                setEmail('');
                await browserSpeak('Before creating the schedule, please confirm the recipient email address.');
                return { success: false, emailValid: false, task: nextTask, frequency: frequencyInput, email: '' };
            }

            if (rawVoiceEmail) {
                const candidate = String(extractedEmail || rawVoiceEmail).trim();
                // FIX 4: Block @example.com placeholder emails
                if (candidate.includes('@example.com')) {
                    setEmail('');
                    await browserSpeak('Please provide your email address.');
                    return { success: false, emailValid: false, task: nextTask, frequency: frequencyInput, email: '' };
                }
                const candidateValid = isValidEmail(candidate) && !candidate.includes(' ');

                if (!candidateValid) {
                    setEmail('');
                    await browserSpeak("I couldn't parse the email address clearly. The form is filled - please type your email and click Schedule It.");
                    return { success: false, emailValid: false, task: nextTask, frequency: frequencyInput, email: '' };
                }

                nextEmail = candidate;
                finalEmailValid = true;
                setEmail(nextEmail);
            }

            await new Promise((resolve) => setTimeout(resolve, 800));

            const stateTaskValue = String(taskRef.current || '').trim();
            const statePipelineLength = Array.isArray(pipelineRef.current) ? pipelineRef.current.length : 0;
            const stateCronValue = String(parsedCronRef.current || '').trim();

            console.log('VOICE SUBMIT - task:', stateTaskValue, 'pipeline length:', statePipelineLength, 'cron:', stateCronValue);

            if (!stateTaskValue || statePipelineLength === 0 || !stateCronValue || !finalEmailValid) {
                await browserSpeak('Some fields are still empty. Please check the form and click Schedule It manually.');
                return { success: false, emailValid: finalEmailValid, task: nextTask, frequency: nextHuman, email: nextEmail };
            }

            const created = await submitSchedule({
                taskValue: nextTask,
                emailValue: nextEmail,
                cronValue: nextCron,
                humanReadableValue: nextHuman,
                nextRunAtValue: nextRunAt,
                pipelineValue: effectivePipelineForSubmit,
            });

            if (!created) {
                await browserSpeak('Schedule creation failed. Please check the scheduler page and try manually.');
                return { success: false, emailValid: finalEmailValid, task: nextTask, frequency: nextHuman, email: nextEmail };
            }

            await browserSpeak(`Schedule created. Every day at ${nextHuman}, I will fetch and report on ${nextTask}.`);
            return { success: true, emailValid: finalEmailValid, task: nextTask, frequency: nextHuman, email: nextEmail };
        } catch {
            await browserSpeak('Schedule creation failed. Please check the scheduler page and try manually.');
            return { success: false, emailValid: false, task: '', frequency: '', email: '' };
        }
    }, [availableAgents, email, submitSchedule]);

    async function handleDelete(id) {
        try {
            await deleteSchedule(id);
            setSchedules((s) => s.filter((x) => x._id !== id));
            toast.success('Schedule deleted');
        } catch (err) {
            toast.error('Failed to delete schedule');
        }
    }

    async function handleToggleActive(id, isActive) {
        setTogglingActive((prev) => ({ ...prev, [id]: true }));
        try {
            const updated = await pauseSchedule(id, isActive);
            setSchedules((prev) => prev.map((s) => (s._id === id ? updated : s)));
            toast.success(isActive ? 'Schedule resumed' : 'Schedule paused');
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to update schedule status');
        } finally {
            setTogglingActive((prev) => ({ ...prev, [id]: false }));
        }
    }

    async function handleRunNow(id) {
        setRunningNow((prev) => ({ ...prev, [id]: true }));
        try {
            await runScheduleNow(id);
            toast.success('Schedule executed successfully');
            await fetchSchedules();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to execute schedule');
        } finally {
            setRunningNow((prev) => ({ ...prev, [id]: false }));
        }
    }


    useEffect(() => {
        const unregister = registerVoicePageHandlers({
            createSchedule: () => toast('Fill in the form and say "create schedule" to submit.'),
            voiceFillAndSubmit,
            runScheduleNow: (name) => {
                const found = schedules.find(s =>
                    String(s.taskDescription || '').toLowerCase().includes(String(name || '').toLowerCase())
                );
                if (found) handleRunNow(found._id);
                else toast.error(`No schedule found matching "${name}"`);
            },
            deleteSchedule: (name) => {
                const found = schedules.find(s =>
                    String(s.taskDescription || '').toLowerCase().includes(String(name || '').toLowerCase())
                );
                if (found) handleDelete(found._id);
                else toast.error(`No schedule found matching "${name}"`);
            },
        }, () => ({
            scheduleNames: schedules.map((s) => String(s.taskDescription || '').trim()).filter(Boolean),
            schedulesCount: schedules.length,
        }));
        return unregister;
    }, [schedules, voiceFillAndSubmit]);

    function formatNextRunLine(schedule) {
        if (!schedule.isActive) return 'Paused - no next run';
        if (!schedule.nextRunAt) return 'Next run pending';

        const date = new Date(schedule.nextRunAt);
        if (Number.isNaN(date.getTime())) return 'Next run pending';

        const now = new Date();
        const diffMs = date.getTime() - now.getTime();
        if (diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000) {
            return `Next run: ${formatDistanceToNow(date, { addSuffix: true })}`;
        }

        if (isTomorrow(date)) {
            return `Next run: Tomorrow at ${format(date, 'h:mm a')}`;
        }

        return `Next run: ${format(date, 'PPP p')}`;
    }

    function buildSchedulePipeline(schedule) {
        if (Array.isArray(schedule.pipeline) && schedule.pipeline.length > 0) {
            return schedule.pipeline;
        }

        if (!Array.isArray(schedule.agentIds) || schedule.agentIds.length === 0) {
            return [];
        }

        return schedule.agentIds
            .map((id) => agents.find((a) => String(a.id || a._id) === String(id)))
            .filter(Boolean)
            .map((agent) => ({
                agentId: String(agent.id || agent._id),
                agentName: agent.name,
                agentColor: agent.color || '#f97316',
            }));
    }

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--text-secondary)] mb-4">
                        <Translate>Active Schedules</Translate>
                    </h2>

                    {loading && (
                        <div className="glass-card p-8 flex items-center justify-center text-[var(--text-muted)]">
                            <div className="flex gap-2 items-center">
                                <div className="w-3 h-3 bg-[#f97316] rounded-full animate-pulse" />
                                <Translate>Loading...</Translate>
                            </div>
                        </div>
                    )}

                    {!loading && schedules.length === 0 && (
                        <div className="glass-card p-10 flex flex-col items-center gap-3 text-center">
                            <Clock size={32} className="text-[var(--text-muted)] opacity-40" />
                            <p className="text-[var(--text-muted)] text-sm"><Translate>No schedules yet.</Translate></p>
                            <p className="text-[var(--text-muted)] text-xs opacity-60"><Translate>Create one using the form.</Translate></p>
                        </div>
                    )}

                    <div className="flex flex-col gap-3">
                        {schedules.map((s) => {
                            const schedulePipeline = buildSchedulePipeline(s);
                            const leadPipelineAgent = schedulePipeline[0];
                            const agentName = leadPipelineAgent?.agentName;
                            const agentColor = leadPipelineAgent?.agentColor || '#f97316';

                            return (
                                <div
                                    key={s._id}
                                    className="glass-card p-4 flex flex-col gap-3 group"
                                    style={{ borderLeft: `3px solid ${agentColor}` }}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">{s.name || s.taskGoal}</p>
                                            {agentName && (
                                                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                                    <Translate>Agent</Translate>: <span style={{ color: agentColor }}>{agentName}</span>
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleDelete(s._id)}
                                            className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
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
                                        <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                                            {s.isActive ? <Translate>ACTIVE</Translate> : <Translate>PAUSED</Translate>}
                                        </span>
                                    </div>

                                    {schedulePipeline.length > 0 && (
                                        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--glass-bg)]/40 px-2.5 py-2">
                                            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">
                                                <Workflow size={11} />
                                                <Translate>Pipeline Flow</Translate>
                                            </div>
                                            <div className="flex items-center gap-1 overflow-x-auto pb-1">
                                                {schedulePipeline.map((step, index) => (
                                                    <div key={`${s._id}-${step.agentId}-${index}`} className="flex items-center gap-1 shrink-0">
                                                        {index > 0 && <ArrowRight size={12} className="text-[var(--text-muted)]/80" />}
                                                        <div className="px-2 py-1 rounded-md border border-[var(--border-subtle)] bg-[var(--glass-bg)] text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                                                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: step.agentColor }} />
                                                            <span>{step.agentName}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <p className="text-[10px] text-[var(--text-muted)]"><Translate>{formatNextRunLine(s)}</Translate></p>

                                    {s.runCount > 0 && (
                                        <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                                            <Activity size={9} />
                                            <Translate>{`Run ${s.runCount} time${s.runCount !== 1 ? 's' : ''}`}</Translate>
                                            {s.lastRunAt && <><span> - </span><Translate>Last</Translate>: {new Date(s.lastRunAt).toLocaleString()}</>}
                                        </p>
                                    )}

                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleToggleActive(s._id, !s.isActive)}
                                            disabled={Boolean(togglingActive[s._id])}
                                            className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-white hover:border-white/20 transition-all cursor-pointer disabled:opacity-50"
                                        >
                                            {togglingActive[s._id] ? <Translate>Updating...</Translate> : s.isActive ? <Translate>Pause</Translate> : <Translate>Resume</Translate>}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleRunNow(s._id)}
                                            disabled={Boolean(runningNow[s._id])}
                                            className="text-xs px-3 py-1.5 rounded-lg border border-[#f97316]/40 text-[#f97316] hover:bg-[#f97316]/15 transition-all cursor-pointer disabled:opacity-50"
                                        >
                                            {runningNow[s._id] ? (
                                                <span className="inline-flex items-center gap-2">
                                                    <span className="w-3 h-3 border-2 border-[#f97316]/40 border-t-[#f97316] rounded-full animate-spin" />
                                                    <Translate>Running...</Translate>
                                                </span>
                                            ) : <Translate>Run Now</Translate>}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--text-secondary)] mb-4 flex items-center gap-2">
                        <Plus size={14} />
                        <Translate>New Schedule</Translate>
                    </h2>

                    <form onSubmit={handleSubmit} className="glass-card p-6 flex flex-col gap-5 border border-[#f97316]/15 shadow-[0_0_0_1px_rgba(249,115,22,0.08)]">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-[var(--text-muted)] uppercase tracking-wide"><Translate>Task Description</Translate></label>
                            <textarea
                                value={task}
                                onChange={(e) => setTask(e.target.value)}
                                placeholder={taskPlaceholder}
                                rows={3}
                                className="w-full glass-card resize-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#f97316]/50"
                            />

                            {userPreferences?.showPipelineRecommendations && suggestion && suggestion.agents.length > 0 && (
                                <div className="mt-3 p-3 bg-accent-cyan/5 border border-accent-cyan/20 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex flex-col gap-2 w-full">
                                        <div className="flex items-center gap-2">
                                            <span className="text-18">✨</span>
                                            <p className="text-12 text-accent-cyan font-medium">
                                                <span className="opacity-70"><Translate>Recommended</Translate>:</span> {suggestion.label}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 overflow-x-auto pb-1 ml-0 sm:ml-7">
                                            {suggestion.agents.map((id, index) => {
                                                const agent = agents.find((a) => String(a.id || a._id) === String(id));
                                                if (!agent) return null;
                                                const prevAgentId = index > 0 ? suggestion.agents[index - 1] : null;
                                                const prevAgent = prevAgentId ? agents.find((a) => String(a.id || a._id) === String(prevAgentId)) : null;
                                                const arrowColor = prevAgent ? prevAgent.color : 'currentColor';

                                                return (
                                                    <div key={`${id}-${index}`} className="flex items-center">
                                                        {index > 0 && (
                                                            <span
                                                                className="mx-1 text-[14px]"
                                                                style={{ color: arrowColor, opacity: 0.6 }}
                                                            >
                                                                →
                                                            </span>
                                                        )}
                                                        <div className="flex flex-col items-center gap-1">
                                                            <div
                                                                className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 transition-transform hover:scale-105"
                                                                title={agent.name}
                                                                style={{
                                                                    backgroundColor: `${agent.color}26`,
                                                                    border: `1px solid ${agent.color}80`,
                                                                    color: agent.color,
                                                                    boxShadow: `0 0 10px ${agent.color}1A`,
                                                                }}
                                                            >
                                                                {agent.name.charAt(0)}
                                                            </div>
                                                            <span className="text-[10px] text-[var(--text-secondary)] font-medium whitespace-nowrap">
                                                                {agent.name}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={usePipeline}
                                        className="text-11 font-bold uppercase tracking-wider text-accent-cyan hover:bg-accent-cyan/10 px-3 py-1.5 rounded border border-accent-cyan/30 transition-all whitespace-nowrap self-end sm:self-auto"
                                    >
                                        <Translate>Use This Pipeline</Translate>
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs text-[var(--text-muted)] uppercase tracking-wide"><Translate>Pipeline</Translate></label>
                                <span className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--border-subtle)] text-[var(--text-muted)]">
                                    <Translate>{`${pipeline.length} step${pipeline.length !== 1 ? 's' : ''}`}</Translate>
                                </span>
                            </div>

                            <div className="glass-card p-3 rounded-lg border border-[var(--border-subtle)]/70 bg-[linear-gradient(135deg,rgba(249,115,22,0.08),rgba(255,255,255,0.02))]">
                                {pipeline.length === 0 ? (
                                    <div className="text-xs text-[var(--text-muted)] flex items-center gap-2">
                                        <Workflow size={12} className="text-[#f97316]" />
                                        <Translate>Add agents to build an execution flow.</Translate>
                                    </div>
                                ) : (
                                    <div className="max-h-64 overflow-y-auto pr-1">
                                        <div className="flex flex-col gap-1.5">
                                            {pipeline.map((slot, index) => (
                                                <div key={`${slot.agentId}-${index}`} className="flex flex-col">
                                                    <div className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--glass-bg)] px-2.5 py-2">
                                                        <span className="w-5 h-5 shrink-0 rounded-full bg-[var(--glass-bg-hover)] border border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)] flex items-center justify-center font-semibold">
                                                            {index + 1}
                                                        </span>
                                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slot.agentColor }} />
                                                        <span className="text-xs text-[var(--text-primary)] font-medium truncate">{slot.agentName}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => removePipelineSlot(index)}
                                                            className="ml-auto text-[var(--text-muted)] hover:text-red-400 cursor-pointer"
                                                            aria-label={`Remove ${slot.agentName}`}
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                    {index < pipeline.length - 1 && (
                                                        <div className="h-4 ml-[14px] border-l border-dashed border-[var(--border-subtle)]/80 flex items-center">
                                                            <ArrowRight size={11} className="text-[var(--text-muted)]/70 -ml-[6px] bg-[var(--card-bg)] rounded-full" />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowAddAgentMenu((v) => !v)}
                                    className="w-full text-xs px-3 py-2 rounded-lg border border-[#f97316]/40 text-[#f9ad6a] hover:text-white hover:border-[#f97316] hover:bg-[#f97316]/10 transition-all cursor-pointer"
                                >
                                    {showAddAgentMenu ? <Translate>CLOSE AGENT LIST</Translate> : <Translate>ADD AGENT</Translate>}
                                </button>

                                {showAddAgentMenu && (
                                    <div className="absolute z-10 mt-2 w-full glass-card rounded-lg border border-[var(--border-subtle)] max-h-56 overflow-y-auto p-1">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                            {agents.map((agent) => (
                                                <button
                                                    key={agent.id || agent._id}
                                                    type="button"
                                                    onClick={() => appendPipelineAgent(agent)}
                                                    className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--glass-bg-hover)] transition-colors cursor-pointer flex items-center gap-2 rounded-md"
                                                >
                                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: agent.color }} />
                                                    <span className="text-[var(--text-primary)] truncate">{agent.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-[var(--text-muted)] uppercase tracking-wide"><Translate>Recipient Email</Translate></label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={emailPlaceholder}
                                className="w-full glass-card text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#f97316]/50"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs text-[var(--text-muted)] uppercase tracking-wide"><Translate>Frequency</Translate></label>
                            <div className="flex flex-wrap gap-2">
                                {QUICK_PRESETS.map((p) => (
                                    <button
                                        key={p.cron}
                                        type="button"
                                        onClick={() => handlePresetClick(p)}
                                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${timeInput === p.display
                                            ? 'border-[#f97316] bg-[#f97316]/15 text-[#f97316]'
                                            : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-white/20 hover:text-white'
                                            }`}
                                    >
                                        <Translate>{p.label}</Translate>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-[var(--text-muted)] uppercase tracking-wide"><Translate>When Should This Run</Translate></label>
                            <input
                                type="text"
                                value={timeInput}
                                onChange={(e) => setTimeInput(e.target.value)}
                                placeholder={timePlaceholder}
                                className="w-full glass-card text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#f97316]/50"
                            />
                        </div>

                        <div className="px-3 py-2.5 rounded-lg bg-[#f97316]/8 border border-[#f97316]/20 min-h-[44px]">
                            {isParsingTime ? (
                                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                                    <span className="w-3 h-3 border-2 border-[#f97316]/40 border-t-[#f97316] rounded-full animate-spin" />
                                    <Translate>Parsing schedule time...</Translate>
                                </div>
                            ) : parseError || parseConfidence < 0.5 ? (
                                <p className="text-xs text-red-400"><Translate>Could not understand this time format - try something like 'daily at 9am'.</Translate></p>
                            ) : (
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <span className="text-[var(--text-muted)]"><Translate>Will run:</Translate></span>
                                    <span className="text-[#f97316] font-semibold">{parsedHumanReadable || <Translate>Not parsed yet</Translate>}</span>
                                    {parsedCron && (
                                        <span className="px-2 py-0.5 rounded border border-[var(--border-subtle)] text-[10px] font-mono text-[var(--text-muted)] bg-[var(--glass-bg)]">
                                            {parsedCron}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {parseClarification && (
                            <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-3 flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-amber-300 text-xs">
                                    <AlertTriangle size={14} />
                                    <span>{parseClarification}</span>
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={clarificationInput}
                                        onChange={(e) => setClarificationInput(e.target.value)}
                                        placeholder={clarifyPlaceholder}
                                        className="flex-1 h-9 px-3 rounded-md bg-[var(--glass-bg)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)]"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleClarificationSubmit}
                                        className="px-3 h-9 rounded-md text-xs border border-amber-400/50 text-amber-300 hover:bg-amber-400/10"
                                    >
                                        <Translate>Clarify</Translate>
                                    </button>
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-3 rounded-xl bg-[#f97316] text-white text-sm font-semibold hover:bg-[#f97316]/90 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {submitting ? (
                                <span className="flex gap-2 items-center">
                                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <Translate>Scheduling...</Translate>
                                </span>
                            ) : (
                                <>
                                    <Clock size={16} />
                                    <Translate>Schedule It</Translate>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
