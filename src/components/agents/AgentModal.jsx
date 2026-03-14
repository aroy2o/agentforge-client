import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../../store';
import { setSelectedAgent, setIsEditing, updateAgent } from '../../store/agentsSlice';
import { TOOLS } from '../../constants/tools';
import { formatTime } from '../../utils/formatters';
import Translate from '../layout/Translate';

const COLORS = [
    '#00d4ff', '#a78bfa', '#f59e0b', '#34d399', '#fb923c',
    '#ec4899', '#6366f1', '#14b8a6', '#f43f5e', '#8b5cf6'
];

export default function AgentModal() {
    const dispatch = useAppDispatch();
    const selectedAgent = useAppSelector((state) => state.agents.selectedAgent);
    const isEditing = useAppSelector((state) => state.agents.isEditing);

    const [editName, setEditName] = useState('');
    const [editRole, setEditRole] = useState('');
    const [editPersonality, setEditPersonality] = useState('');
    const [editTools, setEditTools] = useState([]);
    const [editColor, setEditColor] = useState('');

    useEffect(() => {
        if (selectedAgent && isEditing) {
            setEditName(selectedAgent.name);
            setEditRole(selectedAgent.role);
            setEditPersonality(selectedAgent.personality || '');
            setEditTools([...selectedAgent.tools]);
            setEditColor(selectedAgent.color);
        }
    }, [selectedAgent, isEditing]);

    const handleClose = () => {
        dispatch(setIsEditing(false));
        dispatch(setSelectedAgent(null));
    };

    const handleSave = () => {
        if (!selectedAgent || !editName.trim() || !editRole.trim()) return;
        dispatch(updateAgent({
            id: selectedAgent.id,
            name: editName.trim(),
            role: editRole.trim(),
            personality: editPersonality.trim(),
            tools: editTools,
            color: editColor,
        }));
        handleClose();
    };

    if (!selectedAgent) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(200,210,240,0.4)] dark:bg-[rgba(0,0,0,0.7)]">
                {/* Backdrop click to close */}
                <div
                    className="absolute inset-0 cursor-pointer"
                    onClick={handleClose}
                />

                {/* Modal Window */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="glass-card relative w-[480px] max-h-[80vh] overflow-y-auto scrollbar-thin rounded-xl p-7"
                    style={{
                        backdropFilter: 'blur(40px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                    }}
                >
                    {/* Header Row */}
                    <div className="flex items-center gap-4 mb-6">
                        <div
                            className="w-[50px] h-[50px] rounded-lg flex items-center justify-center shrink-0 font-bold text-2xl"
                            style={{
                                backgroundColor: isEditing ? `${editColor}33` : `${selectedAgent.color}33`,
                                borderColor: isEditing ? `${editColor}80` : `${selectedAgent.color}80`,
                                color: isEditing ? editColor : selectedAgent.color,
                                borderWidth: '1px',
                            }}
                        >
                            {isEditing ? (editName.charAt(0) || '?').toUpperCase() : selectedAgent.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                            {isEditing ? (
                                <div className="flex flex-col gap-2">
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="bg-secondary/50 border border-subtle rounded px-2 py-1 text-base font-bold text-slate-900 dark:text-white outline-none focus:border-accent-cyan"
                                        placeholder="Agent Name"
                                    />
                                    <input
                                        type="text"
                                        value={editRole}
                                        onChange={(e) => setEditRole(e.target.value)}
                                        className="bg-secondary/50 border border-subtle rounded px-2 py-1 text-xs uppercase tracking-widest text-slate-400 dark:text-slate-600 outline-none focus:border-accent-cyan"
                                        placeholder="Agent Role"
                                    />
                                </div>
                            ) : (
                                <>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        <Translate>{selectedAgent.name}</Translate>
                                    </h2>
                                    <div className="text-xs uppercase tracking-widest text-slate-400 dark:text-slate-600 mt-0.5">
                                        <Translate>{selectedAgent.role}</Translate>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Personality Box */}
                    <div className="mb-6">
                        <h3 className="text-xs uppercase tracking-widest text-slate-400 dark:text-slate-600 mb-1.5 flex justify-between items-center">
                            <Translate>Instructions</Translate>
                        </h3>
                        {isEditing ? (
                            <textarea
                                value={editPersonality}
                                onChange={(e) => setEditPersonality(e.target.value)}
                                className="w-full h-[120px] bg-secondary/50 border border-subtle rounded-md p-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed scrollbar-thin outline-none focus:border-accent-cyan resize-none"
                                placeholder="Define the agent's core identity, rules, and output format..."
                            />
                        ) : (
                            <div className="bg-secondary border border-subtle rounded-md p-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                                <Translate>{selectedAgent.personality || ''}</Translate>
                            </div>
                        )}
                    </div>

                    {/* Color Section (Edit Only) */}
                    {isEditing && (
                        <div className="mb-6">
                            <h3 className="text-xs uppercase tracking-widest text-slate-400 dark:text-slate-600 mb-2">
                                <Translate>Theme Color</Translate>
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {COLORS.map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => setEditColor(color)}
                                        className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer"
                                        style={{
                                            backgroundColor: color,
                                            borderColor: editColor === color ? 'white' : 'transparent',
                                            boxShadow: editColor === color ? `0 0 10px ${color}` : 'none'
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tools Section */}
                    <div className="mb-6">
                        <h3 className="text-xs uppercase tracking-widest text-slate-400 dark:text-slate-600 mb-1.5">
                            <Translate>Equipped Tools</Translate>
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {isEditing ? (
                                TOOLS.map((tool) => {
                                    const isEquipped = editTools.includes(tool.id);
                                    return (
                                        <button
                                            key={tool.id}
                                            onClick={() => {
                                                if (isEquipped) setEditTools(editTools.filter(t => t !== tool.id));
                                                else setEditTools([...editTools, tool.id]);
                                            }}
                                            className="rounded-sm px-2 py-1 text-[10px] uppercase tracking-wide flex items-center gap-1.5 transition-colors cursor-pointer"
                                            style={{
                                                backgroundColor: isEquipped ? `${tool.color}26` : 'var(--bg-secondary)',
                                                borderColor: isEquipped ? `${tool.color}4d` : 'var(--border-subtle)',
                                                color: isEquipped ? tool.color : 'var(--text-muted)',
                                                borderWidth: '1px',
                                            }}
                                        >
                                            <span>{tool.icon}</span>
                                            <Translate>{tool.name}</Translate>
                                        </button>
                                    );
                                })
                            ) : (
                                selectedAgent.tools.map((toolId) => {
                                    const tool = TOOLS.find((t) => t.id === toolId);
                                    if (!tool) return null;
                                    return (
                                        <div
                                            key={tool.id}
                                            className="rounded-sm px-2 py-1 text-[10px] uppercase tracking-wide flex items-center gap-1.5"
                                            style={{
                                                backgroundColor: `${tool.color}26`,
                                                borderColor: `${tool.color}4d`,
                                                color: tool.color,
                                                borderWidth: '1px',
                                            }}
                                        >
                                            <span>{tool.icon}</span>
                                            <Translate>{tool.name}</Translate>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Memory Section */}
                    {!isEditing && (
                        <div className="mb-8">
                            <h3 className="text-xs uppercase tracking-widest text-slate-400 dark:text-slate-600 mb-1.5">
                                <Translate>Recent Memory</Translate> ({selectedAgent.memory.length})
                            </h3>
                            {selectedAgent.memory.length === 0 ? (
                                <div className="text-xs text-slate-400 dark:text-slate-600 italic mt-2">
                                    <Translate>No memories yet. Run a task to build memory.</Translate>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {selectedAgent.memory.map((mem, i) => (
                                        <div
                                            key={i}
                                            className="bg-secondary/50 border border-subtle rounded p-2"
                                        >
                                            <div
                                                className="text-xs font-semibold mb-1"
                                                style={{ color: selectedAgent.color }}
                                            >
                                                {mem.goal ? <Translate>{mem.goal}</Translate> : <Translate>Task Completed</Translate>}
                                            </div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight line-clamp-2">
                                                {mem.summary}
                                            </div>
                                            <div className="text-[9px] text-slate-400 dark:text-slate-600 mt-1.5">
                                                {mem.timestamp && formatTime(new Date(mem.timestamp))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Action Buttons */}
                    {isEditing ? (
                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={handleClose}
                                className="flex-1 py-2.5 rounded text-xs uppercase tracking-widest transition-colors bg-secondary/50 hover:bg-secondary border border-subtle text-slate-400 hover:text-slate-200 cursor-pointer"
                            >
                                <Translate>Cancel</Translate>
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!editName.trim() || !editRole.trim()}
                                className="flex-1 py-2.5 rounded text-xs uppercase tracking-widest transition-all bg-accent-cyan/10 hover:bg-accent-cyan/20 border border-accent-cyan/30 text-accent-cyan shadow-[0_0_10px_rgba(0,212,255,0.1)] hover:shadow-[0_0_15px_rgba(0,212,255,0.2)] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                            >
                                <Translate>Save Changes</Translate>
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleClose}
                            className="w-full py-2.5 mt-4 rounded text-xs uppercase tracking-widest transition-colors hover:bg-secondary border border-transparent hover:border-subtle text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 cursor-pointer"
                        >
                            <Translate>Close</Translate>
                        </button>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
