import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { setCompletedTasks } from '../store/taskSlice';
import AppLayout from '../components/layout/AppLayout';
import * as api from '../services/api';
import Translate from '../components/layout/Translate';
import { format, formatDistanceToNow } from 'date-fns';
import { ArrowRight, Clock, CheckCircle2, Layers, Search } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function TaskCard({ task, onClick }) {
  const agentColors = task.agentColors || [];
  const pipeline = task.pipeline || [];
  const goalText = task.taskGoal || 'Completed Pipeline Mission';
  const finalOutput = String(task.finalOutput || '').trim();
  const preview = finalOutput.length > 160 ? finalOutput.slice(0, 160).replace(/#+\s/g, '').replace(/\*\*/g, '') + '…' : finalOutput.replace(/#+\s/g, '').replace(/\*\*/g, '');
  const completedAt = task.completedAt ? new Date(task.completedAt) : null;
  const timeAgo = completedAt ? formatDistanceToNow(completedAt, { addSuffix: true }) : '';
  const agentCount = task.agentCount || agentColors.length || pipeline.length;
  const accentColor = agentColors[0] || '#00d4ff';
  const logCount = Array.isArray(task.logs) ? task.logs.length : 0;

  return (
    <button
      onClick={onClick}
      className="group w-full text-left glass-card rounded-2xl overflow-hidden transition-all duration-200 hover:scale-[1.01] hover:shadow-[0_0_0_1px_rgba(0,212,255,0.18),0_8px_32px_rgba(0,0,0,0.3)] focus:outline-none focus:ring-2 focus:ring-accent-cyan/30"
      style={{ borderLeft: `3px solid ${accentColor}` }}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-[14px] font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 flex-1">
            {goalText}
          </h3>
          <ArrowRight
            size={16}
            className="shrink-0 mt-0.5 text-[var(--text-muted)] group-hover:text-accent-cyan group-hover:translate-x-0.5 transition-all duration-200"
          />
        </div>

        {/* Output preview */}
        {preview && (
          <p className="text-[12px] text-[var(--text-muted)] leading-relaxed line-clamp-2 mb-4">
            {preview}
          </p>
        )}

        {/* Footer meta */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Agent color dots */}
            {agentColors.length > 0 && (
              <div className="flex -space-x-1">
                {agentColors.slice(0, 5).map((color, i) => (
                  <span
                    key={i}
                    className="w-5 h-5 rounded-full border-2 border-[var(--card-bg)] flex items-center justify-center"
                    style={{ backgroundColor: color, zIndex: agentColors.length - i }}
                    title={pipeline[i]?.agentName || `Agent ${i + 1}`}
                  />
                ))}
                {agentColors.length > 5 && (
                  <span className="w-5 h-5 rounded-full border-2 border-[var(--card-bg)] bg-[var(--glass-bg-hover)] text-[9px] text-[var(--text-muted)] flex items-center justify-center font-bold">
                    +{agentColors.length - 5}
                  </span>
                )}
              </div>
            )}

            <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
              <Layers size={10} />
              {agentCount} agent{agentCount !== 1 ? 's' : ''}
            </span>

            {logCount > 0 && (
              <span className="text-[10px] text-[var(--text-muted)]">
                {logCount} steps
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-accent-green/10 border border-accent-green/20 text-accent-green font-semibold">
              <CheckCircle2 size={9} />
              <Translate>Done</Translate>
            </span>
            {timeAgo && (
              <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                <Clock size={9} />
                {timeAgo}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function Results() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const completedTasks = useAppSelector((state) => state.task.completedTasks);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.getTasks()
      .then(tasks => {
        const mapped = tasks.map(t => ({ ...t, id: t._id }));
        dispatch(setCompletedTasks(mapped));
      })
      .catch(err => console.error('Failed to load tasks:', err));
  }, []);

  const filteredTasks = search.trim()
    ? completedTasks.filter(t =>
        String(t.taskGoal || '').toLowerCase().includes(search.toLowerCase())
      )
    : completedTasks;

  return (
    <AppLayout>
      <div className="h-full overflow-y-auto scrollbar-thin p-6 md:p-8 bg-transparent">
        {completedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center gap-2">
            <div className="w-16 h-16 rounded-2xl bg-[var(--glass-bg-hover)] border border-[var(--border-subtle)] flex items-center justify-center mb-2">
              <Layers size={28} className="text-[var(--text-muted)] opacity-40" />
            </div>
            <h2 className="text-sm text-[var(--text-primary)] font-bold tracking-widest uppercase">
              <Translate>Mission Archive Empty</Translate>
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-1 mb-6">
              <Translate>Completed pipeline runs will appear here</Translate>
            </p>
            <button
              onClick={() => navigate('/')}
              className="glass-button-secondary px-5 py-2 rounded-xl text-xs tracking-wide uppercase cursor-pointer"
            >
              <Translate>Return to Dashboard</Translate>
            </button>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-7 flex items-end justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                  <Translate>Mission Archive</Translate>
                </h1>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {search.trim()
                    ? <Translate>{`${filteredTasks.length} of ${completedTasks.length} run${completedTasks.length !== 1 ? 's' : ''}`}</Translate>
                    : <Translate>{`${completedTasks.length} completed run${completedTasks.length !== 1 ? 's' : ''}`}</Translate>
                  }
                </p>
              </div>

              {/* Search bar */}
              <div className="relative flex-shrink-0 w-full sm:w-64">
                <Search
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search missions…"
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[var(--glass-bg)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-accent-cyan/40 transition-all"
                />
              </div>
            </div>

            {/* Card grid */}
            {filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center gap-2">
                <Search size={24} className="text-[var(--text-muted)] opacity-30 mb-2" />
                <p className="text-sm text-[var(--text-muted)]">
                  <Translate>No missions match your search</Translate>
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => navigate(`/results/${task.id || task._id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
