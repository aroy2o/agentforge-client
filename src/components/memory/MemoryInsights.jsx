import { useMemo } from 'react';
import {
    Activity,
    AudioLines,
    BarChart3,
    Bot,
    Brain,
    Clock3,
    Gauge,
    Mail,
    Settings2,
    Sparkles,
    UserRound,
    Workflow,
} from 'lucide-react';
import Translate from '../layout/Translate';

function formatDuration(durationMs) {
    const value = Number(durationMs || 0);
    if (!Number.isFinite(value) || value <= 0) return 'n/a';
    if (value < 1000) return `${value} ms`;
    if (value < 60000) return `${Math.round(value / 100) / 10}s`;
    return `${Math.round(value / 6000) / 10}m`;
}

function truncateText(value, max = 110) {
    const text = String(value || '').trim();
    if (!text) return 'None';
    if (text.length <= max) return text;
    return `${text.slice(0, max - 1)}...`;
}

function getDateKey(dateLike) {
    const date = new Date(dateLike || Date.now());
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatShortDay(dateLike) {
    return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(new Date(dateLike));
}

function formatCompactDate(dateLike) {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
    }).format(new Date(dateLike));
}

function getTaskAgentNames(task, knownAgentNames) {
    const logs = Array.isArray(task?.logsJson) ? task.logsJson : [];
    const names = new Set();

    for (const log of logs) {
        const candidate = String(log?.agentName || '').trim();
        if (!candidate) continue;
        if (candidate === 'System' || candidate === 'Prompt Optimiser') continue;
        if (knownAgentNames.size > 0 && !knownAgentNames.has(candidate)) continue;
        names.add(candidate);
    }

    return Array.from(names);
}

function getAttachmentSummary(toolAttachments = {}) {
    const items = [];
    if (toolAttachments?.attachedPDF) items.push('PDF attached');
    if (toolAttachments?.attachedImage) items.push('Image attached');
    if (String(toolAttachments?.attachedCode || '').trim()) items.push(`${toolAttachments?.codeLanguage || 'code'} attached`);
    if (String(toolAttachments?.attachedData || '').trim()) items.push('Dataset attached');
    if (toolAttachments?.currencyRequest?.from && toolAttachments?.currencyRequest?.to) {
        items.push(`${toolAttachments.currencyRequest.from} -> ${toolAttachments.currencyRequest.to}`);
    }
    if (toolAttachments?.chartRequest) items.push('Chart request ready');
    return items;
}

function MetricCard({ icon: Icon, label, value, hint }) {
    return (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.01))] p-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-muted)]"><Translate>{label}</Translate></div>
                    <div className="mt-1 text-[20px] font-semibold text-[var(--text-primary)] leading-none">{value}</div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--glass-bg)]/80 text-accent-cyan">
                    <Icon className="h-4 w-4" />
                </div>
            </div>
            {hint ? <div className="mt-2 text-[11px] text-[var(--text-secondary)]">{hint}</div> : null}
        </div>
    );
}

function SectionCard({ title, icon: Icon, subtitle, children, accent = 'cyan' }) {
    const accentClass = accent === 'amber'
        ? 'text-amber-300 border-amber-300/20 bg-amber-300/5'
        : accent === 'emerald'
            ? 'text-emerald-300 border-emerald-300/20 bg-emerald-300/5'
            : 'text-cyan-200 border-cyan-300/20 bg-cyan-300/5';

    return (
        <div className={`rounded-2xl border ${accentClass} p-4 shadow-[0_8px_24px_rgba(0,0,0,0.16)]`}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em]">
                        <Icon className="h-4 w-4" />
                        <span><Translate>{title}</Translate></span>
                    </div>
                    {subtitle ? <div className="mt-1 text-[11px] text-[var(--text-secondary)]"><Translate>{subtitle}</Translate></div> : null}
                </div>
            </div>
            <div className="mt-4">{children}</div>
        </div>
    );
}

function MiniBarChart({ points = [] }) {
    const maxValue = Math.max(...points.map((item) => item.value), 1);

    return (
        <div className="grid grid-cols-7 gap-2 items-end h-28">
            {points.map((point) => (
                <div key={point.key} className="flex h-full flex-col items-center justify-end gap-2">
                    <div className="text-[10px] text-[var(--text-muted)]">{point.value}</div>
                    <div className="flex h-20 w-full items-end rounded-xl border border-[var(--border-subtle)] bg-[var(--glass-bg)]/60 px-1.5 pb-1.5">
                        <div
                            className="w-full rounded-lg bg-[linear-gradient(180deg,rgba(56,189,248,0.95),rgba(14,165,233,0.35))] shadow-[0_0_12px_rgba(56,189,248,0.28)]"
                            style={{ height: `${Math.max((point.value / maxValue) * 100, point.value > 0 ? 14 : 4)}%` }}
                        />
                    </div>
                    <div className="text-[10px] text-[var(--text-secondary)]">{point.label}</div>
                </div>
            ))}
        </div>
    );
}

function HorizontalBarList({ items = [], emptyLabel }) {
    const maxValue = Math.max(...items.map((item) => item.value), 1);

    if (!items.length) {
        return <div className="text-[12px] text-[var(--text-muted)]"><Translate>{emptyLabel}</Translate></div>;
    }

    return (
        <div className="space-y-3">
            {items.map((item) => (
                <div key={item.label}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-[11px]">
                        <span className="font-medium text-[var(--text-primary)]">{item.label}</span>
                        <span className="text-[var(--text-muted)]">{item.value}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-[var(--glass-bg)]/70 border border-[var(--border-subtle)] overflow-hidden">
                        <div
                            className="h-full rounded-full bg-[linear-gradient(90deg,rgba(52,211,153,0.95),rgba(16,185,129,0.35))]"
                            style={{ width: `${Math.max((item.value / maxValue) * 100, 8)}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

function DonutGauge({ value = 0, label, sublabel }) {
    const safeValue = Math.max(0, Math.min(100, Number(value || 0)));
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference - (safeValue / 100) * circumference;

    return (
        <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0">
                <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
                    <circle cx="40" cy="40" r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth="8" fill="none" />
                    <circle
                        cx="40"
                        cy="40"
                        r={radius}
                        stroke="rgba(56,189,248,0.95)"
                        strokeWidth="8"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-[18px] font-semibold text-[var(--text-primary)]">{Math.round(safeValue)}%</div>
                </div>
            </div>
            <div>
                <div className="text-[12px] font-semibold text-[var(--text-primary)]"><Translate>{label}</Translate></div>
                <div className="mt-1 text-[11px] text-[var(--text-secondary)]"><Translate>{sublabel}</Translate></div>
            </div>
        </div>
    );
}

function PreferenceSignal({ label, detail, tone = 'cyan' }) {
    const toneClass = tone === 'emerald'
        ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200'
        : tone === 'amber'
            ? 'border-amber-300/25 bg-amber-300/10 text-amber-200'
            : 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100';

    return (
        <div className={`rounded-xl border ${toneClass} px-3 py-2`}>
            <div className="text-[11px] font-semibold"><Translate>{label}</Translate></div>
            <div className="mt-1 text-[11px] opacity-90"><Translate>{detail}</Translate></div>
        </div>
    );
}

export default function MemoryInsights({
    agents = [],
    completedTasks = [],
    taskGoal = '',
    pipeline = [],
    toolAttachments = {},
    isRunning = false,
    user = null,
    userPreferences = {},
    notifications = {},
}) {
    const analytics = useMemo(() => {
        const knownAgentNames = new Set(agents.map((agent) => String(agent?.name || '').trim()).filter(Boolean));
        const totalMemories = agents.reduce((sum, agent) => sum + (Array.isArray(agent?.memory) ? agent.memory.length : 0), 0);
        const agentsWithMemories = agents.filter((agent) => Array.isArray(agent?.memory) && agent.memory.length > 0).length;
        const avgDurationMs = completedTasks.length
            ? completedTasks.reduce((sum, task) => sum + Number(task?.durationMs || 0), 0) / completedTasks.length
            : 0;
        const avgAgentCount = completedTasks.length
            ? completedTasks.reduce((sum, task) => sum + Number(task?.agentCount || 0), 0) / completedTasks.length
            : 0;
        const optimisedCount = completedTasks.filter((task) => {
            const originalTask = String(task?.originalTask || task?.taskGoal || '').trim();
            const optimisedTask = String(task?.optimisedTask || task?.taskGoal || '').trim();
            return originalTask && optimisedTask && originalTask !== optimisedTask;
        }).length;

        const last7Days = Array.from({ length: 7 }, (_, index) => {
            const date = new Date();
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() - (6 - index));
            return date;
        });
        const dailyTaskCounts = last7Days.map((date) => {
            const key = getDateKey(date);
            const value = completedTasks.filter((task) => getDateKey(task?.createdAt) === key).length;
            return {
                key,
                label: formatShortDay(date),
                value,
            };
        });

        const agentUsageMap = new Map();
        const taskModeMap = new Map();
        for (const task of completedTasks) {
            const names = getTaskAgentNames(task, knownAgentNames);
            for (const name of names) {
                agentUsageMap.set(name, (agentUsageMap.get(name) || 0) + 1);
            }

            if (names.includes('Forge')) taskModeMap.set('Coding', (taskModeMap.get('Coding') || 0) + 1);
            else if (names.includes('Scout')) taskModeMap.set('Research', (taskModeMap.get('Research') || 0) + 1);
            else if (names.includes('Sage')) taskModeMap.set('Planning', (taskModeMap.get('Planning') || 0) + 1);
            else if (names.includes('Atlas')) taskModeMap.set('Analysis', (taskModeMap.get('Analysis') || 0) + 1);
            else if (names.includes('Quill') || names.includes('Hermes')) taskModeMap.set('Delivery', (taskModeMap.get('Delivery') || 0) + 1);
            else if (names.length > 0) taskModeMap.set('Mixed', (taskModeMap.get('Mixed') || 0) + 1);
        }

        const toolUsageMap = new Map();
        for (const agent of agents) {
            const memoryEntries = Array.isArray(agent?.memory) ? agent.memory : [];
            for (const entry of memoryEntries) {
                const usedTools = Array.isArray(entry?.toolsUsed) ? entry.toolsUsed : [];
                for (const tool of usedTools) {
                    const key = String(tool || '').trim();
                    if (!key) continue;
                    toolUsageMap.set(key, (toolUsageMap.get(key) || 0) + 1);
                }
            }
        }

        const recentTasks = completedTasks.slice(0, 4).map((task) => ({
            id: task?._id || task?.id,
            title: String(task?.optimisedTask || task?.taskGoal || 'Untitled task').trim(),
            createdAt: task?.createdAt,
            durationMs: task?.durationMs,
            finalOutput: task?.finalOutput,
            agentCount: task?.agentCount,
        }));

        return {
            totalMemories,
            agentsWithMemories,
            avgDurationMs,
            avgAgentCount,
            optimisationRate: completedTasks.length ? (optimisedCount / completedTasks.length) * 100 : 0,
            dailyTaskCounts,
            agentUsage: Array.from(agentUsageMap.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([label, value]) => ({ label, value })),
            taskModes: Array.from(taskModeMap.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 4)
                .map(([label, value]) => ({ label, value })),
            toolUsage: Array.from(toolUsageMap.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([label, value]) => ({ label, value })),
            recentTasks,
        };
    }, [agents, completedTasks]);

    const pipelineNames = pipeline
        .map((agentId) => agents.find((agent) => String(agent.id || agent._id) === String(agentId))?.name)
        .filter(Boolean);

    const attachmentSummary = getAttachmentSummary(toolAttachments);

    const preferenceSignals = useMemo(() => {
        const signals = [];

        signals.push({
            label: 'Prompt refinement',
            detail: userPreferences?.autoOptimisePrompts ? 'Enabled by default for cleaner execution prompts.' : 'Manual mode. Original prompts remain untouched unless changed.',
            tone: userPreferences?.autoOptimisePrompts ? 'emerald' : 'amber',
        });

        signals.push({
            label: 'Pipeline guidance',
            detail: userPreferences?.showPipelineRecommendations ? 'Pipeline suggestions are active while composing tasks.' : 'Recommendations are currently hidden.',
            tone: userPreferences?.showPipelineRecommendations ? 'cyan' : 'amber',
        });

        signals.push({
            label: 'Voice workflow',
            detail: userPreferences?.voiceEnabledByDefault || userPreferences?.voiceControlEnabled
                ? 'Voice-first interaction is part of the user workflow.'
                : 'Text-led workflow with optional voice support.',
            tone: userPreferences?.voiceEnabledByDefault || userPreferences?.voiceControlEnabled ? 'emerald' : 'cyan',
        });

        signals.push({
            label: 'Notification delivery',
            detail: notifications?.emailEnabled
                ? `Results can be delivered to ${notifications?.emailAddress || 'the configured inbox'}.`
                : 'Email notifications are disabled right now.',
            tone: notifications?.emailEnabled ? 'emerald' : 'amber',
        });

        return signals;
    }, [notifications, userPreferences]);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    icon={Brain}
                    label="Memory Fragments"
                    value={analytics.totalMemories}
                    hint={`${analytics.agentsWithMemories}/${agents.length || 0} agents retaining task memory`}
                />
                <MetricCard
                    icon={Activity}
                    label="Completed Tasks"
                    value={completedTasks.length}
                    hint="Recent executions persisted for analytics and recall"
                />
                <MetricCard
                    icon={Clock3}
                    label="Avg Runtime"
                    value={formatDuration(Math.round(analytics.avgDurationMs))}
                    hint="Average duration across persisted pipeline runs"
                />
                <MetricCard
                    icon={Workflow}
                    label="Avg Pipeline Width"
                    value={completedTasks.length ? analytics.avgAgentCount.toFixed(1) : '0.0'}
                    hint="Mean number of agents involved per completed task"
                />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <SectionCard
                    title="Current Context"
                    icon={Sparkles}
                    subtitle="Live snapshot of what the system knows right now"
                >
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--glass-bg)]/65 p-3">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]"><Translate>Active Task</Translate></div>
                            <div className="mt-2 text-[12px] leading-relaxed text-[var(--text-primary)]">{truncateText(taskGoal || '') || <Translate>No active task staged yet.</Translate>}</div>
                        </div>
                        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--glass-bg)]/65 p-3">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]"><Translate>Pipeline Context</Translate></div>
                            <div className="mt-2 text-[12px] leading-relaxed text-[var(--text-primary)]">
                                {pipelineNames.length > 0 ? pipelineNames.join(' -> ') : <Translate>No pipeline agents selected</Translate>}
                            </div>
                            <div className="mt-2 text-[11px] text-[var(--text-secondary)]">
                                {isRunning ? <Translate>Pipeline is currently running.</Translate> : <Translate>Pipeline is idle.</Translate>}
                            </div>
                        </div>
                        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--glass-bg)]/65 p-3 md:col-span-2">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]"><Translate>Attachment and Delivery Context</Translate></div>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {attachmentSummary.length > 0 ? attachmentSummary.map((item) => (
                                    <span key={item} className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 text-[11px] text-cyan-100">
                                        {item}
                                    </span>
                                )) : (
                                    <span className="text-[12px] text-[var(--text-secondary)]"><Translate>No attachments or special execution context attached.</Translate></span>
                                )}
                            </div>
                            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                <div className="rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-[11px] text-[var(--text-secondary)]">
                                    <span className="font-medium text-[var(--text-primary)]"><Translate>User</Translate></span>: {user?.name || 'Anonymous'}
                                </div>
                                <div className="rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-[11px] text-[var(--text-secondary)]">
                                    <span className="font-medium text-[var(--text-primary)]"><Translate>Language</Translate></span>: {userPreferences?.language || user?.preferences?.language || 'en'}
                                </div>
                                <div className="rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-[11px] text-[var(--text-secondary)]">
                                    <span className="font-medium text-[var(--text-primary)]"><Translate>Notification Email</Translate></span>: {notifications?.emailAddress || user?.email || 'Not configured'}
                                </div>
                            </div>
                        </div>
                    </div>
                </SectionCard>

                <SectionCard
                    title="Optimisation Health"
                    icon={Gauge}
                    subtitle="Prompt and execution quality signals from completed work"
                    accent="emerald"
                >
                    <div className="space-y-4">
                        <DonutGauge
                            value={analytics.optimisationRate}
                            label="Prompt optimisation rate"
                            sublabel="How often completed tasks used a refined prompt before execution."
                        />
                        <div className="grid grid-cols-1 gap-2">
                            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--glass-bg)]/60 px-3 py-2 text-[11px] text-[var(--text-secondary)]">
                                <span className="font-medium text-[var(--text-primary)]"><Translate>Top mode</Translate></span>: {analytics.taskModes[0]?.label || <Translate>No task pattern yet</Translate>}
                            </div>
                            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--glass-bg)]/60 px-3 py-2 text-[11px] text-[var(--text-secondary)]">
                                <span className="font-medium text-[var(--text-primary)]"><Translate>Favorite agent</Translate></span>: {analytics.agentUsage[0]?.label || <Translate>No dominant agent yet</Translate>}
                            </div>
                        </div>
                    </div>
                </SectionCard>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <SectionCard
                    title="Task Volume"
                    icon={BarChart3}
                    subtitle="Completed pipelines across the last 7 days"
                >
                    <MiniBarChart points={analytics.dailyTaskCounts} />
                </SectionCard>

                <SectionCard
                    title="Agent Usage"
                    icon={Bot}
                    subtitle="Most active agents in persisted task history"
                    accent="emerald"
                >
                    <HorizontalBarList items={analytics.agentUsage} emptyLabel="No agent usage history yet." />
                </SectionCard>

                <SectionCard
                    title="Tool Memory"
                    icon={Settings2}
                    subtitle="Tools most frequently represented in retained memory"
                    accent="amber"
                >
                    <HorizontalBarList items={analytics.toolUsage} emptyLabel="No tool-usage traces stored yet." />
                </SectionCard>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <SectionCard
                    title="Learned Preference Signals"
                    icon={UserRound}
                    subtitle="Signals derived from saved settings and current operating mode"
                >
                    <div className="grid grid-cols-1 gap-2">
                        {preferenceSignals.map((signal) => (
                            <PreferenceSignal
                                key={signal.label}
                                label={signal.label}
                                detail={signal.detail}
                                tone={signal.tone}
                            />
                        ))}
                        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--glass-bg)]/60 px-3 py-2 text-[11px] text-[var(--text-secondary)]">
                            <div className="flex items-center gap-2 text-[var(--text-primary)] font-medium">
                                <AudioLines className="h-3.5 w-3.5" />
                                <span><Translate>Voice posture</Translate></span>
                            </div>
                            <div className="mt-1"><Translate>Recognition language:</Translate> {userPreferences?.voiceRecognitionLanguage || 'en-US'}.</div>
                        </div>
                        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--glass-bg)]/60 px-3 py-2 text-[11px] text-[var(--text-secondary)]">
                            <div className="flex items-center gap-2 text-[var(--text-primary)] font-medium">
                                <Mail className="h-3.5 w-3.5" />
                                <span><Translate>Delivery posture</Translate></span>
                            </div>
                            <div className="mt-1"><Translate>Auto send:</Translate> {userPreferences?.autoSendEmail ? <Translate>enabled</Translate> : <Translate>disabled</Translate>}.</div>
                        </div>
                    </div>
                </SectionCard>

                <SectionCard
                    title="Recent Task Memory"
                    icon={Workflow}
                    subtitle="Last completed tasks kept within fast-access context"
                    accent="emerald"
                >
                    <div className="space-y-3">
                        {analytics.recentTasks.length > 0 ? analytics.recentTasks.map((task) => (
                            <div key={task.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--glass-bg)]/60 p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-[12px] font-semibold text-[var(--text-primary)] leading-snug">{truncateText(task.title, 90)}</div>
                                    <div className="shrink-0 rounded-full border border-[var(--border-subtle)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
                                        {formatCompactDate(task.createdAt)}
                                    </div>
                                </div>
                                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3 text-[11px] text-[var(--text-secondary)]">
                                    <div><Translate>Runtime:</Translate> <span className="text-[var(--text-primary)]">{formatDuration(task.durationMs)}</span></div>
                                    <div><Translate>Agents:</Translate> <span className="text-[var(--text-primary)]">{task.agentCount || 0}</span></div>
                                    <div><Translate>Output:</Translate> <span className="text-[var(--text-primary)]">{String(task.finalOutput || '').trim() ? <Translate>captured</Translate> : <Translate>empty</Translate>}</span></div>
                                </div>
                            </div>
                        )) : (
                            <div className="text-[12px] text-[var(--text-muted)]"><Translate>No completed tasks have been saved yet.</Translate></div>
                        )}
                    </div>
                </SectionCard>
            </div>
        </div>
    );
}