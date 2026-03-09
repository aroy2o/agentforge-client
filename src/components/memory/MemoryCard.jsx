import { useState } from 'react';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { TOOLS } from '../../constants/tools';

function getRelativeTime(isoString) {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const diffInSeconds = (new Date(isoString).getTime() - Date.now()) / 1000;

    if (Math.abs(diffInSeconds) < 60) return rtf.format(Math.round(diffInSeconds), 'second');
    if (Math.abs(diffInSeconds) < 3600) return rtf.format(Math.round(diffInSeconds / 60), 'minute');
    if (Math.abs(diffInSeconds) < 86400) return rtf.format(Math.round(diffInSeconds / 3600), 'hour');
    return rtf.format(Math.round(diffInSeconds / 86400), 'day');
}

export default function MemoryCard({ memoryEntry }) {
    const { goal, summary, fullOutput, timestamp, toolsUsed } = memoryEntry;
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="glass-card p-[12px] mb-2 shrink-0 border-[var(--border-default)]">
            <div className="text-13 font-semibold text-[var(--text-primary)] mb-2">
                {goal}
            </div>

            <div className="text-12 text-[var(--text-secondary)] leading-relaxed">
                {summary}
            </div>

            {fullOutput && (
                <div className="mt-2 text-left">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-11 text-[var(--text-muted)] hover:text-accent-cyan flex items-center transition-colors mb-2"
                    >
                        {isExpanded ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
                        {isExpanded ? 'Hide full output' : 'Show full output'}
                    </button>

                    {isExpanded && (
                        <pre className="text-12 text-[var(--text-primary)] bg-[var(--bg-panel)] p-2 rounded-md border border-[var(--border-light)] max-h-[200px] overflow-y-auto whitespace-pre-wrap font-sans">
                            {fullOutput}
                        </pre>
                    )}
                </div>
            )}

            <div className="mt-3 flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                    {toolsUsed && toolsUsed.length > 0 && toolsUsed.map((toolName, idx) => {
                        const toolObj = TOOLS.find((t) => t.name === toolName);
                        if (!toolObj) return null;
                        return (
                            <div
                                key={idx}
                                className="h-[20px] rounded-full px-2 flex items-center text-[10px] font-medium uppercase tracking-wide gap-1"
                                style={{
                                    backgroundColor: `${toolObj.color}1A`,
                                    border: `1px solid ${toolObj.color}4D`,
                                    color: toolObj.color,
                                }}
                            >
                                <span className="mb-[1px]">{toolObj.icon}</span>
                                {toolObj.name}
                            </div>
                        );
                    })}
                </div>

                {timestamp && (
                    <div className="text-11 text-[var(--text-muted)] flex items-center gap-1.5 opacity-80 whitespace-nowrap ml-2">
                        <Clock className="w-3 h-3" />
                        <span>{getRelativeTime(timestamp)}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
