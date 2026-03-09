import { AnimatePresence } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../../store';
import { clearPipeline } from '../../store/pipelineSlice';
import PipelineNode from './PipelineNode';
import PipelineArrow from './PipelineArrow';
import Translate from '../layout/Translate';
import { GitCommit } from 'lucide-react';

export default function PipelineCanvas() {
    const dispatch = useAppDispatch();
    const pipeline = useAppSelector((state) => state.pipeline.pipeline);
    const agents = useAppSelector((state) => state.agents.agents);
    const activeAgentId = useAppSelector((state) => state.task.activeAgentId);
    const isRunning = useAppSelector((state) => state.task.isRunning);

    // Rehydrate the pipeline full objects in order
    const pipelineAgents = pipeline
        .map((id) => agents.find((a) => a.id === id))
        .filter(Boolean);

    return (
        <div className="glass-card m-4 overflow-hidden flex flex-col shrink-0">
            {/* Sub-header bar */}
            <div className="h-[44px] px-5 border-b border-[var(--border-subtle)] flex justify-between items-center shrink-0">
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
