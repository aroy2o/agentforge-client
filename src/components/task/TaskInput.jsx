import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { setTaskGoal } from '../../store/taskSlice';
import { clearLogs } from '../../store/logsSlice';
import Translate from '../layout/Translate';
import { addTranslation } from '../../store/languageSlice';
import * as api from '../../services/api';
import toast from 'react-hot-toast';
import { clearPipeline, addToPipeline } from '../../store/pipelineSlice';

// Smart pipeline detection logic
const detectPipeline = (task, agents) => {
    const t = task.toLowerCase();
    const getAgent = (name) => agents.find(a => a.name === name)?.id;
    
    // Keywords
    const emailKw = /email|send to|notify|mail|digest/;
    const searchKw = /search|find|latest|news|today|research|look up|what is/;
    const summarizeKw = /summarize|summary|key points|condense|tldr/;
    const calculateKw = /calculate|percent|roi|profit|loss|interest|budget|cost|price|rupees|dollars|how much|revenue|growth|valuation|market cap/;
    const planKw = /plan|schedule|roadmap|steps|how to|todo|action items|launch/;
    const projectKw = /project|kickoff|timeline|milestone|manage/;
    
    const hasEmail = emailKw.test(t);
    const hasSearch = searchKw.test(t);
    const hasSummarize = summarizeKw.test(t);
    const hasCalculate = calculateKw.test(t);
    const hasPlan = planKw.test(t);
    const hasProject = projectKw.test(t);

    // Helper to return valid detection object
    const result = (agentNames, label) => ({
        agents: agentNames.map(name => getAgent(name)).filter(Boolean),
        label
    });

    // 1. Research + Calculate + Email
    if (hasSearch && hasCalculate && hasEmail) {
        return result(['Scout', 'Atlas', 'Quill', 'Hermes'], 'Research, analyze, draft and send email');
    }

    // 2. Research + Summarize + Email (Moved up for specificity)
    if (hasSearch && hasSummarize && hasEmail) {
        return result(['Scout', 'Lens', 'Quill', 'Hermes'], 'Search, summarize, draft and send email');
    }

    // 3. Research + Email
    if (hasSearch && hasEmail) {
        return result(['Scout', 'Quill', 'Hermes'], 'Research, draft and send email');
    }

    // 4. Research + Calculate
    if (hasSearch && hasCalculate) {
        // User request label: "Research and plan"? No, list says "Research and analyze data".
        return result(['Scout', 'Atlas'], 'Research and analyze data');
    }

    // 5. Research + Summarize
    if (hasSearch && hasSummarize) {
        return result(['Scout', 'Lens'], 'Search and summarize');
    }

    // 6. Calculate + Email
    if (hasCalculate && hasEmail) {
        return result(['Atlas', 'Quill', 'Hermes'], 'Calculate, draft and send email');
    }

    // 7. Single Research
    if (hasSearch) {
        return result(['Scout'], 'Web research');
    }

    // 8. Single Summarize
    if (hasSummarize) {
        return result(['Lens'], 'Summarize content');
    }

    // 9. Single Calculate
    if (hasCalculate) {
        return result(['Atlas'], 'Calculate and analyze');
    }

    // 10. Single Plan
    if (hasPlan) {
        return result(['Sage'], 'Create action plan');
    }

    // 11. Single Project
    if (hasProject) {
        return result(['Max'], 'Project planning');
    }

    // 12. Default
    if (task.length > 20) {
        return result(['Scout', 'Lens'], 'General research and summary');
    }

    return null;
};

export default function TaskInput({ onExecute }) {
    const dispatch = useAppDispatch();
    const taskGoal = useAppSelector((state) => state.task.taskGoal);
    const isRunning = useAppSelector((state) => state.task.isRunning);
    const pipeline = useAppSelector((state) => state.pipeline.pipeline);
    const agents = useAppSelector((state) => state.agents.agents);
    
    // Suggestion state
    const [suggestion, setSuggestion] = useState(null);

    // Grab localized placeholder directly from the Redux cache
    const selectedLanguage = useAppSelector((state) => state.language.selectedLanguage);
    const translations = useAppSelector((state) => state.language.translations) || {};
    const defaultPlaceholder = "Assign a mission to your pipeline... e.g. 'Research AI trends and write a structured executive report with key findings.'";
    const localizedPlaceholder = (selectedLanguage !== 'en' && translations[selectedLanguage]?.[defaultPlaceholder]) || defaultPlaceholder;

    // Fetch the translation if it hasn't been cached
    useEffect(() => {
        if (selectedLanguage !== 'en' && !translations[selectedLanguage]?.[defaultPlaceholder]) {
            api.translate(defaultPlaceholder, selectedLanguage).then(res => {
                dispatch(addTranslation({ lang: selectedLanguage, original: defaultPlaceholder, translated: res }));
            }).catch(e => console.error("Failed to translate placeholder", e));
        }
    }, [selectedLanguage, translations, dispatch, defaultPlaceholder]);

    const isExecutable = !isRunning && taskGoal.trim() !== '' && pipeline.length > 0;

    // Detect pipeline suggestion
    useEffect(() => {
        // Hide if pipeline manually modified (not empty)
        if (pipeline.length > 0) {
            setSuggestion(null);
            return;
        }

        const timer = setTimeout(() => {
            if (taskGoal.length > 15) {
                setSuggestion(detectPipeline(taskGoal, agents));
            } else {
                setSuggestion(null);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [taskGoal, pipeline.length, agents]);

    const usePipeline = () => {
        if (suggestion && suggestion.agents && suggestion.agents.length > 0) {
            dispatch(clearPipeline());
            suggestion.agents.forEach(id => {
                // Verify agent exists before dispatching
                const agent = agents.find(a => a.id === id);
                if (agent) {
                    dispatch(addToPipeline(id));
                }
            });
            toast.success(`Pipeline ready: ${suggestion.label}`);
            setSuggestion(null);
        }
    };

    let executeButtonClass =
        'flex-1 h-[48px] text-13 font-bold tracking-widest uppercase flex items-center justify-center gap-3 transition-all duration-200 ';

    if (!isExecutable) {
        executeButtonClass += 'bg-[rgba(255,255,255,0.02)] border border-[var(--border-subtle)] text-[var(--text-muted)] cursor-not-allowed rounded-lg overflow-hidden ';
    } else {
        executeButtonClass += 'glass-button-primary rounded-lg overflow-hidden ';
    }

    return (
        <div className="glass-card w-full flex flex-col shrink-0">
            {/* Header */}
            <div className="h-[40px] flex items-center px-5 border-b border-[var(--border-subtle)]">
                <span className="section-label m-0">
                    <Translate>MISSION INPUT</Translate>
                </span>
            </div>

            {/* Input Section */}
            <div className="p-[16px]">
                <div className="glass-input rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-accent-cyan/50 focus-within:border-accent-cyan/50 transition-all duration-300">
                    <textarea
                        value={taskGoal}
                        onChange={(e) => dispatch(setTaskGoal(e.target.value))}
                        disabled={isRunning}
                        placeholder={localizedPlaceholder}
                        className="w-full min-h-[120px] 2xl:min-h-[160px] bg-transparent border-none outline-none resize-none text-14 leading-relaxed text-[var(--text-primary)] p-4 placeholder-[var(--text-muted)] disabled:opacity-50"
                    />
                </div>

                {/* Suggestion Banner */}
                {suggestion && suggestion.agents.length > 0 && (
                    <div className="mt-3 p-3 bg-accent-cyan/5 border border-accent-cyan/20 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex flex-col gap-2 w-full">
                            <div className="flex items-center gap-2">
                                <span className="text-18">✨</span>
                                <p className="text-12 text-accent-cyan font-medium">
                                    <span className="opacity-70">Recommended:</span> {suggestion.label}
                                </p>
                            </div>
                            <div className="flex items-center gap-1 overflow-x-auto pb-1 ml-0 sm:ml-7">
                                {suggestion.agents.map((id, index) => {
                                    const agent = agents.find(a => a.id === id);
                                    if (!agent) return null;
                                    // Arrow color logic: use previous agent color or fallback
                                    const prevAgentId = index > 0 ? suggestion.agents[index - 1] : null;
                                    const prevAgent = prevAgentId ? agents.find(a => a.id === prevAgentId) : null;
                                    const arrowColor = prevAgent ? prevAgent.color : 'currentColor';

                                    return (
                                        <div key={`${id}-${index}`} className="flex items-center">
                                            {index > 0 && (
                                                <span 
                                                    className="mx-1 text-[14px]" 
                                                    style={{ color: arrowColor, opacity: 0.6 }}
                                                >
                                                    →
                                                </span>
                                            )}
                                            <div className="flex flex-col items-center gap-1">
                                                <div
                                                    className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 transition-transform hover:scale-105"
                                                    title={agent.name}
                                                    style={{
                                                        backgroundColor: `${agent.color}26`, // ~15% opacity
                                                        border: `1px solid ${agent.color}80`, // ~50% opacity
                                                        color: agent.color,
                                                        boxShadow: `0 0 10px ${agent.color}1A`
                                                    }}
                                                >
                                                    {agent.name.charAt(0)}
                                                </div>
                                                <span className="text-[10px] text-[var(--text-secondary)] font-medium whitespace-nowrap">
                                                    {agent.name}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <button
                            onClick={usePipeline}
                            className="text-11 font-bold uppercase tracking-wider text-accent-cyan hover:bg-accent-cyan/10 px-3 py-1.5 rounded border border-accent-cyan/30 transition-all whitespace-nowrap self-end sm:self-auto"
                        >
                            Use This Pipeline
                        </button>
                    </div>
                )}
            </div>

            {/* Action Row */}
            <div className="px-[16px] pb-[16px] flex items-center gap-3">
                <button
                    disabled={!isExecutable}
                    onClick={onExecute}
                    className={executeButtonClass}
                >
                    {isRunning ? (
                        <>
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <Translate>RUNNING</Translate>
                        </>
                    ) : (
                        <>
                            <span>▶</span>
                            <Translate>EXECUTE PIPELINE</Translate>
                        </>
                    )}
                </button>

                <button
                    onClick={() => dispatch(clearLogs())}
                    className="glass-button-secondary w-28 h-[48px] flex items-center justify-center gap-2 text-13 font-semibold uppercase tracking-widest text-red-500 hover:text-red-400 border border-[var(--border-default)] hover:border-red-500/30 hover:bg-red-500/10 transition-colors"
                >
                    ✕ <Translate>Clear</Translate>
                </button>
            </div>
        </div>
    );
}
