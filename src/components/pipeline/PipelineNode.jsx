import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { removeFromPipeline } from '../../store/pipelineSlice';
import Translate from '../layout/Translate';
import { X } from 'lucide-react';

export default function PipelineNode({ agent, isActive }) {
    const dispatch = useDispatch();
    const isRunning = useSelector((state) => state.task.isRunning);

    const handleRemove = (e) => {
        e.stopPropagation();
        if (!isRunning) {
            dispatch(removeFromPipeline(agent.id));
        }
    };

    let containerClass =
        'glass-card w-[160px] min-h-[72px] px-[14px] py-[12px] relative group cursor-default shadow-sm transition-all shrink-0 ';
    let nodeStyle = {};

    if (isActive) {
        nodeStyle = {
            borderColor: `${agent.color}99`, // 60% opacity
            boxShadow: `0 0 16px ${agent.color}33`, // 20% opacity
        };
    }

    return (
        <motion.div
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 10, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="flex items-center relative shrink-0"
        >
            <div className={containerClass} style={nodeStyle}>

                {/* Active Progress Indicator */}
                {isActive && (
                    <div
                        className="absolute top-0 left-0 h-[2px] w-full animate-pulse"
                        style={{
                            background: `linear-gradient(90deg, transparent, ${agent.color}, transparent)`,
                            boxShadow: `0 0 8px ${agent.color}`
                        }}
                    />
                )}

                {/* Top Row: Avatar and Info */}
                <div className="flex items-center gap-2">
                    <div
                        className="w-[28px] h-[28px] rounded-md flex items-center justify-center shrink-0 font-bold text-12 shadow-sm"
                        style={{
                            backgroundColor: `${agent.color}33`,
                            borderColor: `${agent.color}66`,
                            color: agent.color,
                            borderWidth: '1px',
                        }}
                    >
                        {agent.name.charAt(0)}
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-13 font-semibold text-[var(--text-primary)] truncate">
                            <Translate>{agent.name}</Translate>
                        </span>
                        <span className="text-11 uppercase tracking-wide text-[var(--text-muted)] truncate mt-[1px]">
                            <Translate>{agent.role}</Translate>
                        </span>
                    </div>
                </div>

                {/* Remove Button */}
                <button
                    onClick={handleRemove}
                    disabled={isRunning}
                    className={`absolute top-2 right-2 w-[20px] h-[20px] flex items-center justify-center rounded-sm text-[var(--text-muted)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity bg-transparent border-0 cursor-pointer ${isRunning ? 'hidden' : ''}`}
                    title="Remove from pipeline"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        </motion.div>
    );
}
