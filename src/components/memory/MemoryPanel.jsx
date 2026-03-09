import { useState, useEffect, useMemo } from 'react';
import { useAppSelector } from '../../store';
import MemoryCard from './MemoryCard';
import Translate from '../layout/Translate';
import { Brain, Search, Sparkles } from 'lucide-react';
import apiClient from '../../services/api';

export default function MemoryPanel() {
    const agents = useAppSelector((state) => state.agents.agents);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // Filter agents that only actually have memories
    const agentsWithMemories = useMemo(() =>
        agents.filter(a => a.memory && a.memory.length > 0),
        [agents]
    );

    // Search effect
    useEffect(() => {
        if (searchQuery.trim().length < 3) {
            setSearchResults([]);
            return;
        }

        const debounceId = setTimeout(async () => {
            setIsSearching(true);
            try {
                // To search globally, we search each agent with memory concurrently
                const promises = agentsWithMemories.map(agent =>
                    apiClient.get(`/api/agent/${agent.id}/memories/search?q=${encodeURIComponent(searchQuery)}`)
                        .then(res => ({
                            agent,
                            results: res.data.results
                        }))
                );

                const allResponses = await Promise.all(promises);

                const finalResults = allResponses
                    .filter(res => res.results && res.results.length > 0)
                    .map(res => ({
                        agent: res.agent,
                        results: res.results
                    }));

                setSearchResults(finalResults);
            } catch (err) {
                console.error("Failed RAG search", err);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 500);

        return () => clearTimeout(debounceId);
    }, [searchQuery, agentsWithMemories]);

    return (
        <div className="flex flex-col h-full bg-transparent">
            {/* Header */}
            <div className="shrink-0 h-[48px] flex items-center justify-between px-5 border-b border-[var(--border-subtle)] bg-[var(--bg-panel-header)]">
                <span className="section-label m-0">
                    <Translate>AGENT MEMORY BANKS</Translate>
                </span>

                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--accent-purple)] bg-opacity-10 border border-[var(--accent-purple)] border-opacity-30">
                    <Sparkles className="w-3 h-3 text-[var(--accent-purple)]" />
                    <span className="text-10 font-bold uppercase tracking-wider text-[var(--accent-purple)]">
                        RAG Active
                    </span>
                </div>
            </div>

            {/* Search Bar */}
            <div className="p-4 pb-0 shrink-0">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                        type="text"
                        placeholder="Search semantic memories..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-[36px] bg-[var(--bg-input)] border border-[var(--border-default)] rounded-lg pl-9 pr-3 text-13 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-accent-purple focus:ring-1 focus:ring-accent-purple transition-all outline-none"
                    />
                    {isSearching && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-[var(--accent-purple)] border-t-transparent rounded-full animate-spin" />
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 flex flex-col gap-4">
                {searchQuery.length >= 3 ? (
                    // ── Search Results View ──
                    searchResults.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 h-full opacity-60">
                            <span className="text-13 text-[var(--text-muted)] italic">
                                {isSearching ? "Searching vectors..." : "No semantic matches found."}
                            </span>
                        </div>
                    ) : (
                        searchResults.map(({ agent, results }) => (
                            <div key={agent.id} className="flex flex-col">
                                <div className="flex items-center gap-2 mb-3">
                                    <div
                                        className="w-[24px] h-[24px] rounded-full flex items-center justify-center shrink-0 font-bold text-11 shadow-sm"
                                        style={{ backgroundColor: `${agent.color}33`, borderColor: `${agent.color}66`, color: agent.color, borderWidth: '1px' }}
                                    >
                                        {agent.name.charAt(0) || '?'}
                                    </div>
                                    <span className="text-13 font-semibold text-[var(--text-primary)]">{agent.name}</span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {results.map((r, i) => (
                                        <div key={i} className="glass-card p-3 border-l-2 border-l-[var(--accent-purple)]">
                                            <div className="text-12 font-semibold text-[var(--text-primary)] mb-1">{r.pastGoal}</div>
                                            <div className="text-11 text-[var(--text-secondary)]">{r.relevantOutput.substring(0, 150)}...</div>
                                        </div>
                                    ))}
                                </div>
                                <hr className="border-t border-[var(--border-subtle)] my-4" />
                            </div>
                        ))
                    )
                ) : (
                    <>
                        {agentsWithMemories.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3 h-full">
                                <Brain className="w-8 h-8 text-[var(--border-strong)] opacity-50" />
                                <span className="text-13 text-[var(--text-muted)] italic">
                                    <Translate>No memories yet</Translate>
                                </span>
                            </div>
                        ) : (
                            agentsWithMemories.map((agent, index) => (
                                <div key={agent.id} className="flex flex-col">
                                    {/* Agent Section Header */}
                                    <div className="flex items-center gap-3 mb-3">
                                        <div
                                            className="w-[28px] h-[28px] rounded-full flex items-center justify-center shrink-0 font-bold text-12 shadow-sm"
                                            style={{
                                                backgroundColor: `${agent.color}33`,
                                                borderColor: `${agent.color}66`,
                                                color: agent.color,
                                                borderWidth: '1px',
                                            }}
                                        >
                                            {agent.name.charAt(0) || '?'}
                                        </div>

                                        <span className="text-13 font-semibold text-[var(--text-primary)]">
                                            {agent.name || 'Unnamed'}
                                        </span>

                                        <div className="glass-card text-11 rounded-full px-2 py-0.5 border border-[var(--border-default)] text-[var(--text-secondary)] font-medium">
                                            {agent.memory.length} {agent.memory.length === 1 ? <Translate>memory</Translate> : <Translate>memories</Translate>}
                                        </div>
                                    </div>

                                    {/* Memory Cards */}
                                    <div className="flex flex-col">
                                        {agent.memory.map((mem, i) => (
                                            <MemoryCard key={i} memoryEntry={mem} />
                                        ))}
                                    </div>

                                    {/* Divider between agent sections */}
                                    {index < agentsWithMemories.length - 1 && (
                                        <hr className="border-t border-[var(--border-subtle)] my-2 ml-10" />
                                    )}
                                </div>
                            ))
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
