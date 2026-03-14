import { useState, useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../../store';
import { clearPipeline, saveTemplate, deleteTemplate, reorderPipeline } from '../../store/pipelineSlice';
import PipelineNode from './PipelineNode';
import PipelineArrow from './PipelineArrow';
import Translate from '../layout/Translate';
import { GitCommit, Save, BookOpen, Trash2, X } from 'lucide-react';

export default function PipelineCanvas() {
    const dispatch = useAppDispatch();
    const pipeline = useAppSelector((state) => state.pipeline.pipeline);
    const agents = useAppSelector((state) => state.agents.agents);
    const templates = useAppSelector((state) => state.pipeline.templates);
    const activeAgentId = useAppSelector((state) => state.task.activeAgentId);
    const isRunning = useAppSelector((state) => state.task.isRunning);

    const [savingName, setSavingName] = useState('');
    const [showSaveInput, setShowSaveInput] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const saveInputRef = useRef(null);
    const templatesRef = useRef(null);

    // Rehydrate the pipeline full objects in order
    const pipelineAgents = pipeline
        .map((id) => agents.find((a) => a.id === id))
        .filter(Boolean);

    useEffect(() => {
        if (showSaveInput) saveInputRef.current?.focus();
    }, [showSaveInput]);

    // Close templates dropdown when clicking outside
    useEffect(() => {
        if (!showTemplates) return;
        const handler = (e) => {
            if (templatesRef.current && !templatesRef.current.contains(e.target)) {
                setShowTemplates(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showTemplates]);

    const handleSaveTemplate = () => {
        const name = savingName.trim();
        if (!name || pipeline.length === 0) return;
        dispatch(saveTemplate({ name, agentIds: [...pipeline] }));
        setSavingName('');
        setShowSaveInput(false);
    };

    const handleLoadTemplate = (template) => {
        dispatch(reorderPipeline([...template.agentIds]));
        setShowTemplates(false);
    };

    return (
        <div className="glass-card m-4 overflow-hidden flex flex-col shrink-0">
            {/* Sub-header bar */}
            <div className="h-[44px] px-5 border-b border-[var(--border-subtle)] flex justify-between items-center shrink-0 gap-2">
                <div className="flex items-center gap-3">
                    <span className="section-label m-0">
                        <Translate>PIPELINE</Translate>
                    </span>
                    {pipelineAgents.length > 0 && (
                        <div className="text-11 rounded-full px-2 py-0.5 bg-[var(--glass-bg)] border border-[var(--border-default)] text-[var(--text-muted)] font-medium tracking-wide">
                            {pipeline.length} <Translate>STEPS</Translate>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* Save as template */}
                    {pipelineAgents.length > 0 && !isRunning && (
                        showSaveInput ? (
                            <div className="flex items-center gap-1">
                                <input
                                    ref={saveInputRef}
                                    type="text"
                                    value={savingName}
                                    onChange={(e) => setSavingName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveTemplate();
                                        if (e.key === 'Escape') { setShowSaveInput(false); setSavingName(''); }
                                    }}
                                    placeholder="Template name…"
                                    className="h-[26px] px-2 text-[11px] rounded-lg bg-[var(--glass-bg)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-accent-cyan/40 w-32"
                                />
                                <button
                                    onClick={handleSaveTemplate}
                                    disabled={!savingName.trim()}
                                    className="glass-button-secondary h-[26px] px-2 text-11 text-accent-cyan hover:border-accent-cyan/40 transition-colors disabled:opacity-40"
                                >
                                    <Save size={11} />
                                </button>
                                <button
                                    onClick={() => { setShowSaveInput(false); setSavingName(''); }}
                                    className="glass-button-secondary h-[26px] px-2 text-11 text-[var(--text-muted)] transition-colors"
                                >
                                    <X size={11} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowSaveInput(true)}
                                className="glass-button-secondary h-[28px] px-3 text-12 text-accent-cyan hover:border-accent-cyan/30 transition-colors uppercase tracking-wider flex items-center gap-1"
                                title="Save as template"
                            >
                                <Save size={11} />
                                <Translate>Save</Translate>
                            </button>
                        )
                    )}

                    {/* Load template */}
                    {templates.length > 0 && !isRunning && (
                        <div className="relative" ref={templatesRef}>
                            <button
                                onClick={() => setShowTemplates((v) => !v)}
                                className="glass-button-secondary h-[28px] px-3 text-12 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors uppercase tracking-wider flex items-center gap-1"
                                title="Load template"
                            >
                                <BookOpen size={11} />
                                <Translate>Templates</Translate>
                            </button>

                            {showTemplates && (
                                <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] bg-[var(--card-bg)] border border-[var(--border-default)] rounded-xl shadow-xl overflow-hidden">
                                    {templates.map((t) => (
                                        <div
                                            key={t.id}
                                            className="flex items-center justify-between px-3 py-2 hover:bg-[var(--glass-bg-hover)] transition-colors group"
                                        >
                                            <button
                                                onClick={() => handleLoadTemplate(t)}
                                                className="flex-1 text-left text-[12px] text-[var(--text-primary)] truncate pr-2"
                                            >
                                                {t.name}
                                            </button>
                                            <button
                                                onClick={() => dispatch(deleteTemplate(t.id))}
                                                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all p-0.5"
                                                title="Delete template"
                                            >
                                                <Trash2 size={11} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {pipelineAgents.length > 0 && (
                        <button
                            onClick={() => dispatch(clearPipeline())}
                            disabled={isRunning}
                            className={`glass-button-secondary h-[28px] px-3 text-12 text-red-400 hover:border-[rgba(239,68,68,0.30)] transition-colors uppercase tracking-wider ${isRunning ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                            <Translate>Clear</Translate>
                        </button>
                    )}
                </div>
            </div>

            {/* Main node canvas area */}
            <div className="flex items-center px-6 py-4 min-h-[120px] 2xl:min-h-[160px] w-full overflow-x-auto scrollbar-thin">
                {pipelineAgents.length === 0 ? (
                    <div className="flex items-center justify-center w-full h-full">
                        <div className="border-2 border-dashed border-[var(--border-subtle)] rounded-xl flex items-center justify-center gap-3 py-8 px-12 max-w-md mx-auto">
                            <GitCommit className="w-5 h-5 text-[var(--border-strong)] opacity-50" />
                            <span className="text-14 italic text-[var(--text-muted)]">
                                <Translate>Add agents from the roster to build your pipeline</Translate>
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center">
                        <AnimatePresence mode="popLayout">
                            {pipelineAgents.map((agent, index) => {
                                const isNextActive = isRunning && index < pipelineAgents.length - 1 && activeAgentId === pipelineAgents[index + 1].id;

                                return (
                                    <div key={`${agent.id}-${index}`} className="flex items-center">
                                        <PipelineNode
                                            agent={agent}
                                            isActive={activeAgentId === agent.id}
                                            stepNumber={index + 1}
                                        />
                                        {index < pipelineAgents.length - 1 && (
                                            <PipelineArrow isActive={isNextActive} />
                                        )}
                                    </div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}
