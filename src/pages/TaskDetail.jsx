import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { removeCompletedTask, setCompletedTasks } from '../store/taskSlice';
import AppLayout from '../components/layout/AppLayout';
import LogEntry from '../components/logs/LogEntry';
import Translate from '../components/layout/Translate';
import { useTranslatedText } from '../hooks/useTranslatedText';
import * as api from '../services/api';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format } from 'date-fns';
import {
  ArrowLeft, Copy, Trash2, FileDown, FileText,
  CheckCircle2, Clock, Layers, ChevronRight, Calendar,
  MessageSquare, Cpu, Zap,
} from 'lucide-react';

const MD_COMPONENTS = {
  p: ({ node, ...props }) => <p className="m-0 mb-3 leading-relaxed" {...props} />,
  ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
  ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
  li: ({ node, ...props }) => <li className="leading-relaxed pl-1" {...props} />,
  h1: ({ node, ...props }) => (
    <h1 className="text-xl font-bold text-[var(--text-primary)] mt-6 mb-3 pb-2 border-b border-[var(--border-subtle)]" {...props} />
  ),
  h2: ({ node, ...props }) => (
    <h2 className="text-lg font-semibold text-[var(--text-primary)] mt-5 mb-2" {...props} />
  ),
  h3: ({ node, ...props }) => (
    <h3 className="text-base font-medium text-[var(--text-primary)] mt-4 mb-1.5" {...props} />
  ),
  strong: ({ node, ...props }) => (
    <strong className="font-semibold text-[var(--text-primary)]" {...props} />
  ),
  a: ({ node, ...props }) => (
    <a
      className="text-accent-cyan underline underline-offset-2 decoration-accent-cyan/40 hover:decoration-accent-cyan transition-colors"
      target="_blank"
      rel="noreferrer"
      {...props}
    />
  ),
  code: ({ node, inline, ...props }) =>
    inline ? (
      <code
        className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-accent-cyan font-mono text-[12px] mx-0.5"
        {...props}
      />
    ) : (
      <code
        className="block bg-[var(--bg-elevated)] border border-[var(--border-subtle)] p-4 rounded-xl font-mono text-[12px] overflow-x-auto my-3"
        {...props}
      />
    ),
  pre: ({ node, ...props }) => <pre className="m-0" {...props} />,
  blockquote: ({ node, ...props }) => (
    <blockquote
      className="border-l-2 border-accent-cyan/40 pl-4 italic text-[var(--text-muted)] my-3"
      {...props}
    />
  ),
  table: ({ node, ...props }) => (
    <div className="overflow-x-auto my-4 rounded-xl border border-[var(--border-subtle)]">
      <table className="w-full text-sm" {...props} />
    </div>
  ),
  thead: ({ node, ...props }) => (
    <thead className="bg-[var(--glass-bg-hover)] text-[var(--text-muted)] text-xs uppercase tracking-wider" {...props} />
  ),
  th: ({ node, ...props }) => <th className="px-4 py-2 text-left font-semibold" {...props} />,
  tr: ({ node, ...props }) => (
    <tr className="border-t border-[var(--border-subtle)] hover:bg-[var(--glass-bg-hover)]/30 transition-colors" {...props} />
  ),
  td: ({ node, ...props }) => <td className="px-4 py-2.5" {...props} />,
  hr: () => <hr className="border-[var(--border-subtle)] my-6" />,
};

const LOG_TYPE_CONFIG = {
  thinking: { label: 'Thinking', color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20', icon: '🧠' },
  tool: { label: 'Tool Call', color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', icon: '⚙️' },
  output: { label: 'Output', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', icon: '✅' },
  error: { label: 'Error', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', icon: '❌' },
  system: { label: 'System', color: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/20', icon: '🔧' },
  reframe: { label: 'Optimised', color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20', icon: '✨' },
};

const TABS = [
  { id: 'output', label: 'Output', icon: FileText },
  { id: 'steps', label: 'Pipeline Steps', icon: Layers },
];

export default function TaskDetail() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const completedTasks = useAppSelector((s) => s.task.completedTasks);

  const [activeTab, setActiveTab] = useState('output');
  const [deleting, setDeleting] = useState(false);

  // Load tasks from API if not in Redux yet
  useEffect(() => {
    if (completedTasks.length === 0) {
      api.getTasks()
        .then((tasks) => {
          const mapped = tasks.map((t) => ({ ...t, id: t._id }));
          dispatch(setCompletedTasks(mapped));
        })
        .catch((err) => console.error('Failed to load tasks:', err));
    }
  }, []);

  const task = completedTasks.find((t) => String(t.id || t._id) === String(taskId));

  if (!task) {
    return (
      <AppLayout>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-[var(--text-muted)] mb-4"><Translate>Task not found.</Translate></p>
            <button onClick={() => navigate('/results')} className="glass-button-secondary px-4 py-2 rounded-xl text-sm">
              <Translate>Back to Archive</Translate>
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const goalText = task.taskGoal || 'Completed Pipeline Mission';
  const finalOutput = String(task.finalOutput || '').trim();
  const logs = Array.isArray(task.logs) ? task.logs : [];
  const agentColors = task.agentColors || [];
  const pipeline = task.pipeline || [];
  const completedAt = task.completedAt ? new Date(task.completedAt) : null;
  const usedTodoTool = logs.some((l) => l.type === 'tool' && /to-?do/i.test(l.content || ''));

  // These hooks actively call the translation API when language changes
  const translatedGoal = useTranslatedText(goalText);
  const translatedOutput = useTranslatedText(finalOutput);

  const logTypeCounts = logs.reduce((acc, l) => {
    acc[l.type] = (acc[l.type] || 0) + 1;
    return acc;
  }, {});

  const handleCopy = () => {
    navigator.clipboard.writeText(translatedOutput)
      .then(() => toast.success('Copied to clipboard'))
      .catch(() => toast.error('Failed to copy'));
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this mission from the archive?')) return;
    setDeleting(true);
    const taskIdVal = task.dbId || task._id || task.id;
    try {
      if (task.dbId || task._id) await api.deleteTask(taskIdVal);
      dispatch(removeCompletedTask(task.id || taskIdVal));
      toast.success('Mission deleted');
      navigate('/results');
    } catch {
      toast.error('Failed to delete mission');
    } finally {
      setDeleting(false);
    }
  };

  const extractTodoItems = (text) =>
    String(text || '')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /^([✅☑️✔️]|\d+[.)-]?\s+)/u.test(l));

  const handleAddToCalendar = async () => {
    const items = extractTodoItems(finalOutput);
    if (items.length === 0) { toast.error('No to-do items found in this output.'); return; }
    try {
      await api.createCalendarEvents(items);
      toast.success('Tasks added to Google Calendar');
    } catch {
      toast.error('Failed to add to Google Calendar');
    }
  };

  // Build distinct agent list for pipeline display
  const agentList = pipeline.length > 0
    ? pipeline
    : agentColors.map((color, i) => ({ agentName: `Agent ${i + 1}`, agentColor: color }));

  return (
    <AppLayout>
      <div className="h-full overflow-y-auto scrollbar-thin">
        {/* ── Sticky header ─────────────────────────────────────────── */}
        <div className="sticky top-0 z-20 bg-[var(--bg-base)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)]">
          <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-3">
            <button
              onClick={() => navigate('/results')}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)] transition-all cursor-pointer shrink-0"
            >
              <ArrowLeft size={16} />
            </button>

            <div className="flex-1 min-w-0">
              <h1 className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
                <Translate>{goalText}</Translate>
              </h1>
              {completedAt && (
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                  {format(completedAt, 'MMM d, yyyy · h:mm a')}
                </p>
              )}
            </div>

            {/* Status pill */}
            <span className="shrink-0 flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-accent-green/10 border border-accent-green/25 text-accent-green">
              <CheckCircle2 size={10} />
              <Translate>Complete</Translate>
            </span>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              {usedTodoTool && (
                <button
                  onClick={handleAddToCalendar}
                  title="Add to Calendar"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-accent-cyan hover:bg-accent-cyan/10 transition-all cursor-pointer"
                >
                  <Calendar size={14} />
                </button>
              )}
              <button
                onClick={handleCopy}
                title="Copy output"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-accent-cyan hover:bg-accent-cyan/10 transition-all cursor-pointer"
              >
                <Copy size={14} />
              </button>
              <button
                onClick={() =>
                  api.exportMarkdown({
                    taskGoal: translatedGoal,
                    logs: task.logs,
                    agentCount: task.agentCount || 0,
                    createdAt: task.completedAt,
                    finalOutput: translatedOutput,
                  })
                }
                title="Export Markdown"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-accent-cyan hover:bg-accent-cyan/10 transition-all cursor-pointer"
              >
                <FileDown size={14} />
              </button>
              <button
                onClick={() =>
                  api.exportPDF({
                    taskGoal: translatedGoal,
                    logs: task.logs,
                    agentCount: task.agentCount || 0,
                    createdAt: task.completedAt,
                    finalOutput: translatedOutput,
                  })
                }
                title="Export PDF"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[#f97316] hover:bg-[#f97316]/10 transition-all cursor-pointer"
              >
                <FileText size={14} />
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                title="Delete mission"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 transition-all cursor-pointer disabled:opacity-40"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div className="max-w-5xl mx-auto px-6 flex items-center gap-1 pb-0">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium border-b-2 transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'border-accent-cyan text-accent-cyan'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon size={13} />
                  <Translate>{tab.label}</Translate>
                  {tab.id === 'steps' && logs.length > 0 && (
                    <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--glass-bg-hover)] text-[var(--text-muted)]">
                      {logs.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Body ──────────────────────────────────────────────────── */}
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-8">

          {/* Stat cards row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              icon={<Layers size={16} />}
              label="Agents"
              value={task.agentCount || agentColors.length || 1}
              color="#00d4ff"
            />
            <StatCard
              icon={<Zap size={16} />}
              label="Steps"
              value={logs.length}
              color="#a78bfa"
            />
            <StatCard
              icon={<Cpu size={16} />}
              label="Output length"
              value={`${finalOutput.split(/\s+/).filter(Boolean).length} words`}
              color="#f59e0b"
            />
            <StatCard
              icon={<Clock size={16} />}
              label="Completed"
              value={completedAt ? format(completedAt, 'h:mm a') : '—'}
              color="#34d399"
            />
          </div>

          {/* Agent pipeline display */}
          {agentList.length > 0 && (
            <div className="glass-card rounded-2xl p-5">
              <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-3 font-semibold">
                <Translate>Pipeline</Translate>
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {agentList.map((agent, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {i > 0 && <ChevronRight size={12} className="text-[var(--text-muted)]/60" />}
                    <div
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[12px] font-medium"
                      style={{
                        borderColor: `${agent.agentColor}40`,
                        backgroundColor: `${agent.agentColor}10`,
                        color: agent.agentColor,
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: agent.agentColor }}
                      />
                      {agent.agentName}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── OUTPUT TAB ─────────────────────────────── */}
          {activeTab === 'output' && (
            <div className="glass-card rounded-2xl p-6 md:p-8">
              {finalOutput ? (
                <div className="prose-output text-[14px] text-[var(--text-primary)] leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
                    {translatedOutput}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <MessageSquare size={32} className="text-[var(--text-muted)] opacity-30 mb-3" />
                  <p className="text-[var(--text-muted)] text-sm">
                    <Translate>No output was captured for this run.</Translate>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── PIPELINE STEPS TAB ─────────────────────── */}
          {activeTab === 'steps' && (
            <div className="flex flex-col gap-3">
              {/* Type badge summary */}
              {Object.keys(logTypeCounts).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-1">
                  {Object.entries(logTypeCounts).map(([type, count]) => {
                    const cfg = LOG_TYPE_CONFIG[type] || LOG_TYPE_CONFIG.system;
                    return (
                      <span
                        key={type}
                        className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border}`}
                      >
                        <span>{cfg.icon}</span>
                        {count} {cfg.label}
                      </span>
                    );
                  })}
                </div>
              )}

              {logs.length > 0 ? (
                logs.map((log, i) => <LogEntry key={log.id || i} log={log} />)
              ) : (
                <div className="glass-card rounded-2xl p-12 text-center">
                  <p className="text-[var(--text-muted)] text-sm">
                    <Translate>No step logs were recorded for this run.</Translate>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div
      className="glass-card rounded-xl p-4 flex flex-col gap-2"
      style={{ borderTop: `2px solid ${color}30` }}
    >
      <div className="flex items-center gap-2" style={{ color }}>
        {icon}
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
          <Translate>{label}</Translate>
        </span>
      </div>
      <p className="text-[18px] font-bold text-[var(--text-primary)] leading-none">
        {value}
      </p>
    </div>
  );
}
