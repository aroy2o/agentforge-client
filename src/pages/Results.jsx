import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../store';
import { removeCompletedTask, setCompletedTasks } from '../store/taskSlice';
import AppLayout from '../components/layout/AppLayout';
import * as api from '../services/api';
import LogEntry from '../components/logs/LogEntry';
import { formatTime } from '../utils/formatters';
import Translate from '../components/layout/Translate';

function TaskArchiveCard({ task }) {
  const dispatch = useAppDispatch();
  const [isExpanded, setIsExpanded] = useState(false);

  // Pull the Redux translation cache so exports use the currently displayed language
  const selectedLang = useAppSelector(s => s.language.selectedLanguage);
  const translations = useAppSelector(s => s.language.translations) || {};
  const t = (str) => (selectedLang !== 'en' && translations[selectedLang]?.[str]) || str;

  const goalText = task.taskGoal?.length > 80 ? task.taskGoal.substring(0, 80) + '...' : task.taskGoal || 'Completed Pipeline Mission';
  const agentColors = task.agentColors || [];
  const logs = task.logs || [];
  const finalOutput = task.finalOutput || '';

  // Resolved (possibly translated) strings for export/copy
  const translatedGoal = t(goalText);
  const translatedOutput = t(finalOutput);

  const handleCopy = () => {
    navigator.clipboard.writeText(translatedOutput)
      .then(() => toast.success('Output copied to clipboard.'))
      .catch(() => toast.error('Failed to copy output.'));
  };

  const handleDelete = async () => {
    const taskId = task.dbId || task._id || task.id;
    try {
      if (task.dbId || task._id) {
        await api.deleteTask(taskId);
      }
      dispatch(removeCompletedTask(task.id || taskId));
      toast.success('Task removed from archive.');
    } catch (err) {
      toast.error('Failed to delete task');
      console.error(err);
    }
  };

  return (
    <div className="glass-card rounded-xl p-6 shadow-[var(--shadow-xl)] max-w-4xl w-full mx-auto relative z-10 transition-colors duration-300 mb-3">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-mono text-slate-800 dark:text-slate-100 tracking-widest uppercase truncate leading-tight">
          <Translate>{goalText}</Translate>
        </h3>
        <span className="text-xs text-slate-400 dark:text-slate-600 shrink-0">
          {task.completedAt ? formatTime(new Date(task.completedAt)) : ''}
        </span>
      </div>

      {/* Metadata Row */}
      <div className="flex gap-4 items-center mt-2">
        {agentColors.length > 0 && (
          <div className="flex -space-x-1.5">
            {agentColors.map((color, i) => (
              <div
                key={i}
                className="w-3.5 h-3.5 rounded-full border border-subtle"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        )}
        <div className="rounded bg-accent-green/15 border border-accent-green/30 text-accent-green text-[9px] uppercase px-1.5 py-0.5 font-bold tracking-wider">
          <Translate>Complete</Translate>
        </div>
      </div>

      {/* Expand Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-600 hover:text-slate-800 dark:hover:text-slate-100 cursor-pointer transition-colors"
      >
        <span>{isExpanded ? <Translate>▼ Hide Log</Translate> : <Translate>▶ View Full Log</Translate>}</span>
      </button>

      {/* Expanded Logs Area */}
      {isExpanded && (
        <div className="mt-4 glass-card rounded-lg p-4 max-h-[400px] overflow-y-auto scrollbar-thin">
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <LogEntry key={log.id || index} log={log} />
            ))
          ) : (
            <div className="text-xs text-slate-400 dark:text-slate-600 italic text-center py-2">
              No logs captured for this task.
            </div>
          )}

          <h4 className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-600 mt-6 mb-2 font-bold"><Translate>Raw Pipeline Output</Translate></h4>
          <pre className="text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed cursor-text selection:bg-accent-cyan/30">
            <Translate>{task.finalOutput}</Translate>
          </pre>
        </div>
      )}

      {/* Footer Row */}
      <div className="flex gap-2 mt-4 justify-end">
        {finalOutput && (
          <div className="flex flex-row gap-2">
            <button
              onClick={() => {
                api.exportMarkdown({
                  taskGoal: translatedGoal,
                  logs: task.logs,
                  agentCount: task.agentCount || 0,
                  createdAt: task.completedAt,
                  finalOutput: translatedOutput
                });
              }}
              className="glass-button-secondary h-[32px] px-3 text-12 font-medium"
            >
              <Translate>MD</Translate>
            </button>
            <button
              onClick={() => {
                api.exportPDF({
                  taskGoal: translatedGoal,
                  logs: task.logs,
                  agentCount: task.agentCount || 0,
                  createdAt: task.completedAt,
                  finalOutput: translatedOutput
                });
              }}
              className="glass-button-secondary h-[32px] px-3 text-12 font-medium"
            >
              <Translate>PDF</Translate>
            </button>
            <button
              onClick={handleCopy}
              className="glass-button-secondary h-[32px] px-3 text-12 font-medium"
            >
              <Translate>Copy</Translate>
            </button>
          </div>
        )}
        <button
          onClick={handleDelete}
          className="px-3 py-1.5 bg-transparent border border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors rounded text-xs font-mono"
        >
          <Translate>Delete</Translate>
        </button>
      </div>
    </div>
  );
}

export default function Results() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const completedTasks = useAppSelector((state) => state.task.completedTasks);

  useEffect(() => {
    api.getTasks()
      .then(tasks => {
        // Map _id to id so local Redux logic keeps working consistently
        const mapped = tasks.map(t => ({ ...t, id: t._id }));
        dispatch(setCompletedTasks(mapped));
      })
      .catch(err => console.error('Failed to load tasks:', err));
  }, []); // Empty dependency array prevents infinite re-rendering loops

  return (
    <AppLayout>
      <div className="h-full overflow-y-auto scrollbar-thin p-6 md:p-8 bg-transparent">
        {completedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center gap-1">
            <div className="text-4xl mb-2 text-slate-400 dark:text-slate-600 opacity-50">❖</div>
            <h2 className="text-sm text-slate-400 dark:text-slate-600 font-bold tracking-widest uppercase">
              <Translate>Mission Archive Empty</Translate>
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-600 mt-1 mb-6">
              <Translate>Completed pipeline runs will appear here</Translate>
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-slate-400/10 dark:bg-slate-600/10 border border-subtle hover:border-slate-600 dark:hover:border-slate-400 text-slate-600 dark:text-slate-400 transition-colors rounded-lg text-xs tracking-wide uppercase cursor-pointer"
            >
              <Translate>Return to Dashboard</Translate>
            </button>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h1 className="text-sm uppercase tracking-widest text-accent-cyan font-bold mb-1">
                <Translate>Mission Archive</Translate>
              </h1>
              <p className="text-xs text-slate-400 dark:text-slate-600">
                {completedTasks.length} completed mission{completedTasks.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="flex flex-col">
              {completedTasks.map((task) => (
                <TaskArchiveCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
