import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TOOLS } from '../../constants/tools';
import AgentGrid from '../agents/AgentGrid';
import Translate from './Translate';
import { X, ChevronRight, Menu, MessageSquare, Plus, Clock, Settings, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Sidebar({ onClose, isCollapsed, onToggleCollapse }) {
    const navigate = useNavigate();
    const [isToolsExpanded, setIsToolsExpanded] = useState(false);

    return (
        <div className="w-full h-full flex flex-col relative z-20">
            {/* Top section — Agent Roster */}
            <div className="flex-1 overflow-y-auto scrollbar-thin flex flex-col">
                <div className="sticky top-0 z-10 glass-header h-[64px] flex items-center justify-between px-4">
                    <div className={`flex items-center gap-3 ${isCollapsed ? 'mx-auto' : ''}`}>
                        {onToggleCollapse && (
                            <button
                                onClick={onToggleCollapse}
                                className="hidden lg:flex w-8 h-8 items-center justify-center rounded-lg hover:bg-white/5 text-[var(--text-secondary)] hover:text-white transition-all cursor-pointer"
                                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                        )}
                        {!isCollapsed && (
                            <h2 className="text-[11px] uppercase tracking-widest text-accent-cyan font-bold m-0 pl-1">
                                <Translate>AGENT ROSTER</Translate>
                            </h2>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5">
                        {!isCollapsed && (
                            <>
                                <button
                                    onClick={() => navigate('/chat')}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-accent-cyan hover:bg-accent-cyan/10 transition-colors cursor-pointer"
                                    title="View Chat Sessions"
                                >
                                    <MessageSquare size={16} />
                                </button>
                                <button
                                    onClick={() => navigate('/scheduler')}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[#f97316] hover:bg-[#f97316]/10 transition-colors cursor-pointer"
                                    title="Scheduler"
                                >
                                    <Clock size={16} />
                                </button>
                                <button
                                    onClick={() => navigate('/builder')}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                    title="Create New Agent"
                                >
                                    <Plus size={18} />
                                </button>
                                <button
                                    onClick={() => navigate('/settings')}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-accent-cyan hover:bg-accent-cyan/10 transition-colors cursor-pointer"
                                    title="Settings"
                                >
                                    <Settings size={16} />
                                </button>
                                <button
                                    onClick={() => navigate('/memory')}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-accent-cyan hover:bg-accent-cyan/10 transition-colors cursor-pointer"
                                    title="Memory Intelligence"
                                >
                                    <Brain size={16} />
                                </button>
                            </>
                        )}
                        {onClose && (
                            <button onClick={onClose} className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-white/10 hover:text-white transition-colors cursor-pointer">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="p-[12px] flex flex-col gap-3">
                    <AgentGrid isCollapsed={isCollapsed} />
                </div>
            </div>

            {/* Bottom section — Tool Library */}
            <div className="shrink-0 border-t border-[var(--border-subtle)] px-2 2xl:px-4 py-3 bg-[var(--bg-elevated)] z-20">
                <button
                    onClick={() => !isCollapsed && setIsToolsExpanded(!isToolsExpanded)}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} group cursor-pointer`}
                    title={isCollapsed ? "Expand sidebar to view tool library" : "Toggle tool library"}
                >
                    {!isCollapsed ? (
                        <h3 className="text-[11px] uppercase tracking-widest font-bold text-[var(--text-secondary)] group-hover:text-white transition-colors pl-1">
                            <Translate>TOOL LIBRARY</Translate>
                        </h3>
                    ) : (
                        <div className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-[var(--text-secondary)] group-hover:text-white transition-colors">
                            <ChevronRight size={18} />
                        </div>
                    )}

                    {!isCollapsed && (
                        <ChevronRight
                            size={16}
                            className={`text-[var(--text-muted)] group-hover:text-white transition-transform duration-300 ${isToolsExpanded ? 'rotate-90' : ''}`}
                        />
                    )}
                </button>

                <AnimatePresence>
                    {isToolsExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0, marginTop: 0 }}
                            animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col overflow-hidden"
                        >
                            {TOOLS.map((tool) => (
                                <div
                                    key={tool.id}
                                    className="flex items-center gap-3 h-[44px] px-3 rounded-lg transition-colors hover:bg-[var(--glass-bg)] cursor-default"
                                >
                                    <div
                                        className="w-4 h-4 flex items-center justify-center shrink-0"
                                        style={{ color: tool.color }}
                                    >
                                        {tool.icon}
                                    </div>
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="text-13 font-medium text-[var(--text-primary)] truncate">
                                            <Translate>{tool.name}</Translate>
                                        </span>
                                        <span className="text-11 text-[var(--text-muted)] truncate whitespace-nowrap overflow-hidden">
                                            <Translate>{tool.description}</Translate>
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
