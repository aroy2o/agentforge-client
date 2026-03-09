import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import {
    setSessions, setActiveSession, deleteSession as deleteSessionAction,
    setSearchQuery, updateSessionTitle, addSession, addMessageToActiveSession
} from '../store/chatSlice';
import { setTaskGoal } from '../store/taskSlice';
import { reorderPipeline } from '../store/pipelineSlice';
import * as api from '../services/api';
import { useAgentRunner } from '../hooks/useAgentRunner';
import { Search, Plus, Trash2, Edit2, Play, Check, Send, Bot, User, Cpu, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import AgentModal from '../components/agents/AgentModal';
import Translate from '../components/layout/Translate';
import { addTranslation } from '../store/languageSlice';
import { useVoiceAgent } from '../hooks/useVoiceAgent';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function relativeTime(dateStr) {
    const d = new Date(dateStr);
    const diff = Math.floor((Date.now() - d) / 60000);
    if (diff < 1) return 'just now';
    if (diff < 60) return `${diff}m ago`;
    const h = Math.floor(diff / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

function MarkdownContent({ content }) {
    // Lightweight markdown: bold, code blocks, bullet lists, numbered lists
    const html = content
        .replace(/```([\s\S]*?)```/g, '<pre class="code-block">$1</pre>')
        .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>')
        .replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>')
        .replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>')
        .replace(/^- (.+)$/gm, '<li class="md-li">$1</li>')
        .replace(/^(\d+)\. (.+)$/gm, '<li class="md-li md-oli">$1. $2</li>')
        .replace(/(<li.*<\/li>\n?)+/g, m => `<ul class="md-ul">${m}</ul>`)
        .replace(/\n\n/g, '<br/><br/>');
    return <div className="md-body text-14 leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
}

// Like <Translate> but translates and THEN renders as markdown
function TranslatedMarkdown({ content }) {
    const dispatch = useAppDispatch();
    const selectedLanguage = useAppSelector(s => s.language.selectedLanguage);
    const translations = useAppSelector(s => s.language.translations);

    useEffect(() => {
        if (!content || selectedLanguage === 'en') return;
        const cached = translations?.[selectedLanguage]?.[content];
        if (!cached) {
            api.translate(content, selectedLanguage).then(res => {
                dispatch(addTranslation({ lang: selectedLanguage, original: content, translated: res }));
            }).catch(console.error);
        }
    }, [content, selectedLanguage, dispatch]);

    const translatedContent = (selectedLanguage !== 'en' && translations?.[selectedLanguage]?.[content]) || content;
    return <MarkdownContent content={translatedContent} />;
}

function TypingDots() {
    return (
        <div className="flex gap-1 items-center py-1">
            {[0, 1, 2].map(i => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cyan)] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
        </div>
    );
}

export default function ChatHistory() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { sessions, activeSessionId, searchQuery } = useAppSelector(s => s.chat);
    const { executePipeline } = useAgentRunner();
    const isRunning = useAppSelector(s => s.task.isRunning);
    const token = useAppSelector(s => s.auth.token);

    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const { speak } = useVoiceAgent();
    const [streamingText, setStreamingText] = useState('');
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitleValue, setEditTitleValue] = useState('');
    const [mode, setMode] = useState('chat'); // 'chat' or 'history'

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const abortRef = useRef(null);

    useEffect(() => {
        api.getChatSessions().then(data => dispatch(setSessions(data))).catch(console.error);
    }, [dispatch]);

    const activeSession = sessions.find(s => s.sessionId === activeSessionId);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeSession?.messages, streamingText]);

    // Auto-focus input
    useEffect(() => {
        if (!isStreaming) inputRef.current?.focus();
    }, [activeSessionId, isStreaming]);

    const handleNewChat = async () => {
        try {
            const result = await api.createChatSession({ title: 'New Chat', taskGoal: '' });
            dispatch(addSession(result.session));
            dispatch(setActiveSession(result.sessionId));
            setMode('chat');
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteSession = async (e, sessionId) => {
        e.stopPropagation();
        try {
            await api.deleteChatSession(sessionId);
            dispatch(deleteSessionAction(sessionId));
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveTitle = async () => {
        if (!activeSession || !editTitleValue.trim()) return;
        setIsEditingTitle(false);
        try {
            await api.updateChatTitle(activeSession.sessionId, editTitleValue);
            dispatch(updateSessionTitle({ sessionId: activeSession.sessionId, title: editTitleValue }));
        } catch (err) { console.error(err); }
    };

    const sendMessage = useCallback(async () => {
        if (!input.trim() || isStreaming) return;

        let sessionId = activeSessionId;
        let currentSession = activeSession;
        const messageText = input.trim();
        setInput('');

        // Create a new session if none is active
        if (!sessionId) {
            try {
                const result = await api.createChatSession({
                    title: messageText.substring(0, 40),
                    taskGoal: messageText
                });
                sessionId = result.sessionId;
                currentSession = result.session;
                dispatch(addSession(result.session));
                dispatch(setActiveSession(sessionId));
            } catch (err) {
                console.error(err);
                return;
            }
        }

        // Add user message to Redux immediately
        const userMsg = { id: Date.now().toString(), role: 'user', content: messageText, timestamp: new Date().toISOString() };
        dispatch(addMessageToActiveSession(userMsg));
        api.addChatMessage(sessionId, userMsg).catch(console.error);

        // Build conversation history for context
        const history = [
            ...(currentSession?.messages || []).map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: messageText }
        ];

        // Stream from backend
        setIsStreaming(true);
        setStreamingText('');

        try {
            const controller = new AbortController();
            abortRef.current = controller;

            const response = await fetch(`${API_BASE}/api/chat/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ messages: history }),
                signal: controller.signal
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(l => l.startsWith('data:'));

                for (const line of lines) {
                    const raw = line.replace(/^data:\s*/, '').trim();
                    if (raw === '[DONE]') break;
                    try {
                        const parsed = JSON.parse(raw);
                        if (parsed.token) {
                            fullText += parsed.token;
                            setStreamingText(fullText);
                        }
                    } catch { /* skip */ }
                }
            }

            // Commit finished assistant message
            if (fullText) {
                const assistantMsg = {
                    id: Date.now().toString() + 'a',
                    role: 'assistant',
                    agentName: 'ARIA',
                    agentColor: '#00d4ff',
                    content: fullText,
                    timestamp: new Date().toISOString()
                };
                dispatch(addMessageToActiveSession(assistantMsg));
                api.addChatMessage(sessionId, assistantMsg).catch(console.error);

                // Read output aloud if voice is enabled
                speak(fullText);

                // Auto-title session from first user question
                const sess = sessions.find(s => s.sessionId === sessionId);
                if (!sess || sess.title === 'New Chat' || sess.title === 'New Session') {
                    const newTitle = messageText.substring(0, 40);
                    api.updateChatTitle(sessionId, newTitle).catch(console.error);
                    dispatch(updateSessionTitle({ sessionId, title: newTitle }));
                }
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                const errMsg = { id: Date.now().toString() + 'e', role: 'system', content: '⚠️ Connection error. Is Ollama running?', timestamp: new Date().toISOString() };
                dispatch(addMessageToActiveSession(errMsg));
            }
        } finally {
            setIsStreaming(false);
            setStreamingText('');
            abortRef.current = null;
        }
    }, [input, isStreaming, activeSessionId, activeSession, sessions, dispatch, token]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleStopStreaming = () => {
        abortRef.current?.abort();
    };

    const handleRerun = () => {
        if (!activeSession || isRunning) return;
        dispatch(setTaskGoal(activeSession.taskGoal));
        if (activeSession.pipelineAgents?.length > 0) {
            const ids = activeSession.pipelineAgents.map(a => a.agentId).filter(Boolean);
            dispatch(reorderPipeline(ids));
        }
        navigate('/');
        setTimeout(() => executePipeline(), 200);
    };

    const filteredSessions = sessions.filter(s =>
        s.title.toLowerCase().includes((searchQuery || '').toLowerCase())
    );

    const messages = activeSession?.messages || [];

    return (
        <div className="flex flex-col h-screen w-screen bg-[var(--bg-base)] overflow-hidden">
            {/* ── NAVBAR ── */}
            <div className="h-[64px] shrink-0">
                <Header />
            </div>

            {/* ── MAIN CHAT LAYOUT ── */}
            <div className="flex flex-1 overflow-hidden">
                {/* ── LEFT SIDEBAR ── */}
                <div className="w-[280px] shrink-0 border-r border-white/5 flex flex-col bg-transparent relative z-10">
                    <div className="p-4 flex flex-col gap-3">
                        <button onClick={handleNewChat} className="glass-button w-full py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-medium hover:bg-white/5 border border-white/10 transition-colors cursor-pointer text-[var(--text-primary)]">
                            <Plus size={16} /> <Translate>New Chat</Translate>
                        </button>
                        <div className="relative mt-1">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                            <input
                                type="text" placeholder="Search sessions..." value={searchQuery}
                                onChange={e => dispatch(setSearchQuery(e.target.value))}
                                className="w-full pl-9 pr-3 py-2 text-xs bg-[var(--bg-overlay)] border border-white/5 focus:border-white/10 outline-none rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-2 pb-2 scrollbar-thin">
                        <div className="px-3 pb-2 pt-1">
                            <h2 className="text-[10px] uppercase tracking-widest text-accent-cyan font-bold"><Translate>Recent Sessions</Translate></h2>
                        </div>
                        {filteredSessions.map(({ sessionId, title, updatedAt, pipelineAgents, messages: msgs }) => {
                            const preview = msgs?.length > 0 ? msgs[msgs.length - 1].content.substring(0, 55) : '';
                            const isActive = sessionId === activeSessionId;
                            const isPipeline = pipelineAgents?.length > 0;

                            return (
                                <div
                                    key={sessionId}
                                    onClick={() => { dispatch(setActiveSession(sessionId)); setMode(isPipeline ? 'history' : 'chat'); }}
                                    className={`group relative p-3 mb-1 rounded-xl cursor-pointer transition-all border text-left ${isActive ? 'bg-accent-cyan/5 border-accent-cyan/20' : 'border-transparent hover:bg-white/5 hover:border-white/10'}`}
                                >
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        {isPipeline
                                            ? <Cpu size={11} className="text-[var(--text-muted)] shrink-0" />
                                            : <Bot size={11} className="text-accent-cyan shrink-0" />
                                        }
                                        <span className="text-13 font-semibold truncate flex-1">{title}</span>
                                    </div>
                                    <p className="text-11 text-[var(--text-muted)] truncate pl-4">{preview || 'Empty session'}</p>
                                    <div className="flex items-center justify-between mt-1 pl-4">
                                        {isPipeline && (
                                            <div className="flex gap-0.5">
                                                {pipelineAgents.slice(0, 5).map((a, i) => (
                                                    <div key={i} className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: a.agentColor || '#666' }} />
                                                ))}
                                            </div>
                                        )}
                                        <span className="text-[10px] text-[var(--text-muted)] opacity-60 ml-auto">{relativeTime(updatedAt)}</span>
                                    </div>
                                    <button onClick={e => handleDeleteSession(e, sessionId)} className="absolute right-2 top-2.5 opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--text-muted)] hover:text-red-500 transition-all">
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            );
                        })}
                        {filteredSessions.length === 0 && (
                            <p className="text-center text-xs text-slate-600 mt-10">No sessions yet.<br />Start a new chat!</p>
                        )}
                    </div>
                </div>

                {/* ── RIGHT: CHAT AREA ── */}
                <div className="flex-1 flex flex-col h-full min-w-0">
                    {/* Header */}
                    <div className="h-[56px] shrink-0 border-b border-white/10 flex items-center px-5 gap-3 bg-[var(--bg-panel)]">
                        <div className="flex-1 flex items-center gap-2 min-w-0">
                            {isEditingTitle ? (
                                <>
                                    <input autoFocus type="text" value={editTitleValue}
                                        onChange={e => setEditTitleValue(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSaveTitle()}
                                        className="glass-input px-3 py-1 flex-1 text-sm rounded outline-none max-w-[400px]"
                                    />
                                    <button onClick={handleSaveTitle} className="p-1 text-accent-green hover:bg-white/5 rounded"><Check size={16} /></button>
                                </>
                            ) : (
                                activeSession ? (
                                    <>
                                        <Bot size={18} className="text-accent-cyan shrink-0" />
                                        <h1 className="text-15 font-semibold truncate">{activeSession.title}</h1>
                                        <button onClick={() => { setEditTitleValue(activeSession.title); setIsEditingTitle(true); }} className="p-1 text-slate-500 hover:text-accent-cyan rounded shrink-0">
                                            <Edit2 size={13} />
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Bot size={18} className="text-accent-cyan" />
                                        <h1 className="text-15 font-semibold text-[var(--text-primary)]"><Translate>ARIA — AI Assistant</Translate></h1>
                                    </div>
                                )
                            )}
                        </div>

                        {activeSession?.pipelineAgents?.length > 0 && (
                            <button onClick={handleRerun} disabled={isRunning} className="glass-button-secondary px-3 py-1.5 flex items-center gap-2 text-12 shrink-0">
                                <Play size={13} /> <Translate>Re-run Pipeline</Translate>
                            </button>
                        )}
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-6 flex flex-col gap-5">
                        {messages.length === 0 && !isStreaming && (
                            <div className="flex-1 flex flex-col items-center justify-center gap-6 py-20 text-center">
                                <div className="w-20 h-20 rounded-2xl bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-center shadow-[0_0_40px_rgba(0,212,255,0.15)]">
                                    <Bot size={36} className="text-accent-cyan" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold mb-2"><Translate>Ask ARIA anything</Translate></h2>
                                    <p className="text-[var(--text-muted)] text-sm max-w-sm"><Translate>Your intelligent AI assistant — powered locally by Ollama. Ask questions, brainstorm ideas, get explanations.</Translate></p>
                                </div>
                                <div className="grid grid-cols-2 gap-2 max-w-md w-full">
                                    {[
                                        'Explain how neural networks work',
                                        'Write a Python script to sort a CSV file',
                                        'What are the best practices for REST APIs?',
                                        'Summarize the concept of RAG in AI'
                                    ].map(hint => (
                                        <button key={hint} onClick={() => setInput(hint)}
                                            className="glass-card text-left p-3 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-accent-cyan/30 transition-all rounded-xl border border-white/5">
                                            {hint}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map(msg => {
                            if (msg.role === 'system') {
                                return (
                                    <div key={msg.id} className="text-center text-11 text-[var(--text-muted)] italic py-1">
                                        <Translate>{msg.content}</Translate>
                                    </div>
                                );
                            }

                            if (msg.role === 'user') {
                                return (
                                    <div key={msg.id} className="flex justify-end gap-3">
                                        <div className="max-w-[72%] flex flex-col items-end gap-1">
                                            <div className="glass-card rounded-2xl rounded-tr-sm px-4 py-3 text-14 leading-relaxed border-l-[2px] border-accent-cyan/60">
                                                <Translate>{msg.content}</Translate>
                                            </div>
                                            <span className="text-[10px] text-[var(--text-muted)] px-1">
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="w-8 h-8 rounded-full shrink-0 bg-blue-500/20 border border-blue-500/40 flex items-center justify-center mt-1">
                                            <User size={14} className="text-blue-400" />
                                        </div>
                                    </div>
                                );
                            }

                            // Assistant message
                            return (
                                <div key={msg.id} className="flex gap-3">
                                    <div
                                        className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-bold text-11 mt-1"
                                        style={{ backgroundColor: `${msg.agentColor || '#00d4ff'}22`, border: `1px solid ${msg.agentColor || '#00d4ff'}44`, color: msg.agentColor || '#00d4ff' }}
                                    >
                                        {msg.agentName?.charAt(0) || 'A'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-12 font-semibold" style={{ color: msg.agentColor || '#00d4ff' }}>{msg.agentName || 'ARIA'}</span>
                                            <span className="text-[10px] text-[var(--text-muted)]">
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="glass-card rounded-2xl rounded-tl-sm px-5 py-4">
                                            <TranslatedMarkdown content={msg.content} />
                                            {msg.toolsUsed?.length > 0 && (
                                                <div className="mt-3 pt-2 border-t border-white/10 flex gap-1.5 flex-wrap">
                                                    {msg.toolsUsed.map((t, i) => (
                                                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 uppercase tracking-wide">{t}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Streaming indicator */}
                        {isStreaming && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-bold text-11 mt-1 bg-accent-cyan/20 border border-accent-cyan/40 text-accent-cyan">
                                    A
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-12 font-semibold text-accent-cyan">ARIA</span>
                                        <span className="text-[10px] text-accent-cyan/60 animate-pulse">Thinking...</span>
                                    </div>
                                    <div className="glass-card rounded-2xl rounded-tl-sm px-5 py-4">
                                        {streamingText ? (
                                            <MarkdownContent content={streamingText} />
                                        ) : (
                                            <TypingDots />
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Bar */}
                    <div className="shrink-0 px-4 py-4 border-t border-white/10 bg-[var(--bg-panel)]">
                        <div className="relative max-w-4xl mx-auto">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={isStreaming}
                                placeholder="Message ARIA... (Enter to send, Shift+Enter for newline)"
                                rows={1}
                                className="glass-input w-full px-5 py-3.5 pr-14 text-14 rounded-2xl outline-none resize-none leading-relaxed disabled:opacity-50 transition-all focus:border-accent-cyan/30"
                                style={{ maxHeight: 160, overflowY: 'auto' }}
                            />
                            <div className="absolute right-3 bottom-3 flex items-center gap-1">
                                {isStreaming ? (
                                    <button onClick={handleStopStreaming} className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 hover:bg-red-500/30 transition-all" title="Stop">
                                        <RefreshCw size={15} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={sendMessage}
                                        disabled={!input.trim()}
                                        className="w-9 h-9 rounded-xl bg-accent-cyan/20 border border-accent-cyan/40 flex items-center justify-center text-accent-cyan hover:bg-accent-cyan/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        <Send size={15} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <p className="text-center text-[10px] text-slate-600 mt-2"><Translate>Powered by local Ollama — responses run on your hardware</Translate></p>
                    </div>
                </div>
            </div>

            {/* Global Modals */}
            <AgentModal />
        </div>
    );
}
