import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
});

// ── Request interceptor: attach JWT token if present ─────────────────────────
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('agentforge_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        if (import.meta.env.DEV) {
            console.log(`🚀 [API Request] ${config.method.toUpperCase()} ${config.url}`);
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 globally ─────────────────────────────────
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        console.error('🚨 [API Error]', error.response?.data || error.message);

        if (error.response?.status === 401 && window.location.pathname !== '/auth') {
            // Lazy-import store to avoid circular dependency
            const { default: store } = await import('../store');
            const { logout } = await import('../store/authSlice');
            store.dispatch(logout());
            localStorage.removeItem('agentforge_token');
            window.location.href = '/auth';
        }

        return Promise.reject(error);
    }
);

export const runAgent = async (payload) => {
    const response = await api.post('/api/agent/run', payload);
    return response.data;
};

export const generateAgentPrompt = async (payload) => {
    const response = await api.post('/api/agent/generate-prompt', payload);
    return response.data; // { generatedPersonality }
};

export const runAgentStream = (payload, onToken, onComplete) => {
    const abortController = new AbortController();

    (async () => {
        try {
            const token = localStorage.getItem('agentforge_token');
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(`${api.defaults.baseURL}/api/agent/run-stream`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
                signal: abortController.signal
            });

            if (!response.ok) throw new Error('Network response was not ok');

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let fullText = '';
            let buffer = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');

                // Keep the last partial line in the buffer
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6).trim();
                        if (dataStr === '[DONE]') {
                            if (onComplete) onComplete(fullText);
                            return;
                        }

                        try {
                            const parsed = JSON.parse(dataStr);
                            if (parsed.token) {
                                fullText += parsed.token;
                                if (onToken) onToken(parsed.token);
                            }
                            if (parsed.done) {
                                if (onComplete) onComplete(fullText);
                                return;
                            }
                        } catch (e) {
                            console.error('SSE JSON Parse Error', e, dataStr);
                        }
                    }
                }
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Stream aborted');
            } else {
                console.error('Streaming error:', error);
            }
        }
    })();

    return () => abortController.abort();
};

export const searchWeb = async (query) => {
    const response = await api.post('/api/tools/web_search', { query });
    return response.data; // { content, sources }
};

export const calculate = async (expression) => {
    const response = await api.post('/api/tools/calculator', { expression });
    return response.data.result;
};

export const summarize = async (text) => {
    const response = await api.post('/api/tools/summarize', { text });
    return response.data.summary;
};

export const draftEmail = async (subject, context) => {
    const response = await api.post('/api/tools/email_draft', { subject, context });
    return response.data.email;
};

export const extractTodos = async (content) => {
    const response = await api.post('/api/tools/todo', { content });
    return response.data.todos;
};

export const speak = async (text) => {
    const { default: store } = await import('../store');
    const language = store.getState().language.selectedLanguage || 'en';

    const response = await api.post('/api/voice/speak', { text, language }, {
        responseType: 'arraybuffer',
        validateStatus: (status) => status < 500
    });

    if (response.status === 204) return null;
    if (response.data && response.data.byteLength === 0) return null;

    return {
        data: response.data,
        contentType: response.headers['content-type'] || 'audio/mpeg',
        engine: response.headers['x-voice-engine'] || 'unknown'
    };
};

export const translate = async (text, targetLanguage) => {
    const response = await api.post('/api/tools/translate', { text, targetLanguage });
    return response.data.translatedText;
};

export const getSupportedLanguages = async () => {
    const response = await api.get('/api/tools/languages');
    return response.data;
};

export const parseVoiceCommand = async (transcript, conversationHistory = []) => {
    const response = await api.post('/api/voice/command', { transcript, conversationHistory });
    return response.data;
};

// Fully client-side Markdown export — no server round-trip, UTF-8 safe for any language
export const exportMarkdown = ({ taskGoal, logs = [], agentCount, createdAt, finalOutput }) => {
    const safeDate = createdAt ? new Date(createdAt).toLocaleString() : new Date().toLocaleString();
    let md = `# ${taskGoal || 'Task Report'}\n\n`;
    md += `*Date: ${safeDate} | Agents: ${agentCount || 0}*\n\n---\n\n`;

    const outputLogs = logs.filter(l => l.type === 'output' && l.content?.trim().length > 10);
    if (outputLogs.length > 0) {
        outputLogs.forEach(log => {
            md += `## ${log.agentName || 'Agent'}\n\n${log.content.trim()}\n\n`;
        });
    } else if (finalOutput) {
        md += finalOutput;
    }

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agentforge-report.md';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
};

// Client-side PDF export via browser print — uses OS fonts, supports ALL languages/scripts
export const exportPDF = ({ taskGoal, logs = [], agentCount, createdAt, finalOutput }) => {
    const safeDate = createdAt ? new Date(createdAt).toLocaleString() : new Date().toLocaleString();
    const outputLogs = logs.filter(l => l.type === 'output' && l.content?.trim().length > 10);

    const bodyContent = outputLogs.length > 0
        ? outputLogs.map(log =>
            `<h2 style="font-size:14px;margin:20px 0 6px;color:#222">${log.agentName || 'Agent'}</h2>
             <p style="font-size:12px;line-height:1.7;color:#333;white-space:pre-wrap">${log.content.trim()}</p>`
        ).join('')
        : `<pre style="font-size:11px;line-height:1.7;color:#333;white-space:pre-wrap;font-family:inherit">${finalOutput || ''}</pre>`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html><html><head>
        <meta charset="UTF-8">
        <title>AgentForge Report</title>
        <style>
            body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #111; }
            h1 { font-size: 22px; text-align: center; margin-bottom: 4px; }
            .meta { font-size: 11px; color: #888; text-align: center; margin-bottom: 28px; }
            .goal { font-size: 14px; font-weight: 600; margin-bottom: 6px; }
            hr { border: none; border-top: 1px solid #ddd; margin: 20px 0; }
        </style>
        </head><body>
        <h1>AgentForge Report</h1>
        <p class="goal">${taskGoal || ''}</p>
        <p class="meta">${safeDate} &nbsp;|&nbsp; Agents: ${agentCount || 0}</p>
        <hr/>
        ${bodyContent}
        </body></html>
    `);
    printWindow.document.close();
    // Give the page a moment to render fonts before print dialog
    setTimeout(() => { printWindow.print(); }, 400);
};

export const getTasks = async () => {
    const response = await api.get('/api/user/tasks');
    return response.data.tasks;
};

export const deleteTask = async (taskId) => {
    const response = await api.delete(`/api/user/tasks/${taskId}`);
    return response.data;
};

export const getChatSessions = async () => {
    const response = await api.get('/api/chat');
    return response.data.sessions;
};

export const createChatSession = async (payload) => {
    const response = await api.post('/api/chat', payload);
    return response.data; // { session, sessionId }
};

export const addChatMessage = async (sessionId, message) => {
    const response = await api.post(`/api/chat/${sessionId}/messages`, { message });
    return response.data.session;
};

export const deleteChatSession = async (sessionId) => {
    const response = await api.delete(`/api/chat/${sessionId}`);
    return response.data;
};

export const updateChatTitle = async (sessionId, title) => {
    const response = await api.put(`/api/chat/${sessionId}/title`, { title });
    return response.data.session;
};

export const sendEmail = async ({ to, subject, body }) => {
    const response = await api.post('/api/tools/send-email', { to, subject, body });
    return response.data;
};

export default api;
