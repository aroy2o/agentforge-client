import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { addToPipeline, removeFromPipeline } from '../../store/pipelineSlice';
import { setSelectedAgent, setIsEditing, deleteAgent } from '../../store/agentsSlice';
import { TOOLS } from '../../constants/tools';
import Translate from '../layout/Translate';
import { Pencil, Trash2, Check, Plus } from 'lucide-react';

export default function AgentCard({ agent, isActive, inPipeline, isCollapsed }) {
    const dispatch = useAppDispatch();
    const isRunning = useAppSelector((state) => state.task.isRunning);
    const [confirmDelete, setConfirmDelete] = useState(false);

    // Reset confirm state if unmounted
    useEffect(() => {
        return () => setConfirmDelete(false);
    }, []);

    // Ensure the card acts as a group for hover classes
    let cardClass = `glass-card rounded-xl p-3 mb-2 border border-transparent hover:border-white/10 hover:bg-white/[0.02] cursor-pointer relative overflow-hidden group transition-all duration-300 ${isActive ? 'bg-accent-cyan/5 border-accent-cyan/20' : ''}`;

    const handlePipelineAction = (e) => {
        e.stopPropagation();
        if (inPipeline) {
            dispatch(removeFromPipeline(agent.id));
        } else {
            dispatch(addToPipeline(agent.id));
        }
    };

    const handleCardClick = () => {
        dispatch(setSelectedAgent(agent));
    };

    if (isCollapsed) {
        return (
            <div
                className={`w-[40px] h-[40px] shrink-0 mx-auto rounded-lg flex items-center justify-center font-bold text-15 cursor-pointer transition-all duration-200 hover:scale-105 ${isActive ? 'ring-2 ring-accent-cyan ring-ring-offset-[var(--bg-base)]' : 'opacity-80 hover:opacity-100'}`}
                style={{
                    backgroundColor: `${agent.color}33`,
                    border: `1px solid ${agent.color}66`,
                    color: agent.color,
                }}
                onClick={handleCardClick}
                title={agent.name}
            >
                {agent.name.charAt(0)}
            </div>
        );
    }

    return (
        <div
            className={cardClass}
            onClick={handleCardClick}
        >
            {/* Top Row: Avatar & Info */}
            <div className="flex items-start gap-3 relative z-10">
                {/* Avatar */}
                <div
                    className="w-[36px] h-[36px] rounded-lg shrink-0 flex items-center justify-center font-bold text-15"
                    style={{
                        backgroundColor: `${agent.color}33`, // 20% opacity using hex
                        border: `1px solid ${agent.color}66`, // 40% opacity using hex
                        color: agent.color,
                    }}
                >
                    {agent.name.charAt(0)}
                </div>

                {/* Name & Role */}
                <div className="flex-1 min-w-0 flex flex-col pt-0.5">
                    <span className="text-15 font-semibold text-[var(--text-primary)] truncate">
                        <Translate>{agent.name}</Translate>
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-12 font-medium uppercase tracking-wide text-[var(--text-muted)] truncate">
                            <Translate>{agent.role}</Translate>
                        </span>
                        {agent.category && (
                            <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 border border-subtle rounded-sm text-slate-500 bg-slate-900/50 hidden sm:inline-block">
                                {agent.category}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Tool Pills */}
            {agent.tools && agent.tools.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {agent.tools.map((toolId) => {
                        const tool = TOOLS.find((t) => t.id === toolId);
                        if (!tool) return null;
                        return (
                            <div
                                key={tool.id}
                                className="h-[20px] rounded px-1.5 flex items-center text-[10px] font-semibold uppercase tracking-wider gap-1 border"
                                style={{
                                    backgroundColor: `${tool.color}0D`, // 5% opacity
                                    border: `1px solid ${tool.color}33`, // 20% opacity
                                    color: tool.color,
                                }}
                            >
                                <span className="mb-[1px]">{tool.icon}</span>
                                <Translate>{tool.name}</Translate>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pipeline Actions */}
            <div className="mt-3 flex justify-end relative z-10 w-full">
                {inPipeline ? (
                    <button
                        onClick={handlePipelineAction}
                        disabled={isRunning}
                        className={`h-[26px] px-3 rounded-md flex items-center justify-center text-[10px] font-bold tracking-wider uppercase border transition-all border-accent-green/30 bg-accent-green/10 text-accent-green hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 group/btn ${isRunning ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                        <span className="flex items-center group-hover/btn:hidden"><Check className="w-3.5 h-3.5 mr-1" /> <Translate>Added</Translate></span>
                        <span className="hidden items-center group-hover/btn:flex"><Trash2 className="w-3.5 h-3.5 mr-1" /> <Translate>Remove</Translate></span>
                    </button>
                ) : (
                    <button
                        onClick={handlePipelineAction}
                        disabled={isRunning}
                        className={`h-[26px] px-3 rounded-md flex items-center justify-center text-[10px] font-bold tracking-wider uppercase border transition-all border-white/10 bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 hover:text-white hover:border-white/20 ${isRunning ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                        <Plus className="w-3.5 h-3.5 mr-1" /> <Translate>Add</Translate>
                    </button>
                )}
            </div>

            {/* Top Right Corner Status / Actions */}
            <div className="absolute top-3 right-3 flex items-center gap-1 z-20">
                {/* Active Indicator (Visible when active and NOT hovering) */}
                <div className={`transition-opacity duration-200 ${(isActive && !confirmDelete) ? 'opacity-100 group-hover:opacity-0' : 'opacity-0'}`}>
                    <div className="w-[8px] h-[8px] rounded-full bg-accent-cyan animate-pulse shadow-[0_0_8px_rgba(0,212,255,0.8)]" />
                </div>

                {/* Hover Actions (Visible only on hover) */}
                {confirmDelete ? (
                    <div className="absolute top-0 right-0 flex items-center gap-2 bg-[var(--bg-panel)] px-2 py-1 rounded-md shadow-[var(--shadow-lg)] border border-[var(--border-strong)]">
                        <span className="text-[11px] text-[var(--text-muted)] whitespace-nowrap"><Translate>Remove agent?</Translate></span>
                        <button
                            onClick={(e) => { e.stopPropagation(); dispatch(deleteAgent(agent.id)); setConfirmDelete(false); }}
                            className="text-[11px] font-bold text-[var(--red)] hover:text-red-400 cursor-pointer"
                        >
                            <Translate>Confirm</Translate>
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
                            className="text-[11px] text-[var(--text-primary)] hover:text-white cursor-pointer"
                        >
                            <Translate>Cancel</Translate>
                        </button>
                    </div>
                ) : (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-0 right-0 flex gap-1" title={agent.isDefault ? "Default agents can be edited but not deleted." : ""}>
                        <button
                            className={`w-[24px] h-[24px] rounded-md glass-button-secondary flex items-center justify-center text-[var(--text-muted)] hover:text-accent-cyan transition-colors cursor-pointer ${agent.isDefault ? 'opacity-80' : ''}`}
                            onClick={(e) => { e.stopPropagation(); dispatch(setSelectedAgent(agent)); dispatch(setIsEditing(true)); }}
                        >
                            <Pencil className="w-[12px] h-[12px]" />
                        </button>
                        <button
                            className={`w-[24px] h-[24px] rounded-md glass-button-secondary flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--red)] transition-colors cursor-pointer ${agent.isDefault ? 'opacity-40 pointer-events-none' : ''}`}
                            onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
                        >
                            <Trash2 className="w-[12px] h-[12px]" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
