// Smart pipeline detection logic
export const detectPipeline = (task, agents) => {
    const t = task
        .toLowerCase()
        .replace(/[^a-z0-9\s]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const normalizedAgents = (Array.isArray(agents) ? agents : []).map((agent) => ({
        raw: agent,
        id: agent?.id || agent?._id || null,
        name: String(agent?.name || '').toLowerCase().trim(),
        role: String(agent?.role || '').toLowerCase().trim(),
        category: String(agent?.category || '').toLowerCase().trim(),
        tools: Array.isArray(agent?.tools) ? agent.tools.map((tool) => String(tool || '').toLowerCase()) : [],
    }));

    const semanticProfiles = {
        Forge: {
            names: ['forge', 'coder', 'developer', 'dev', 'engineer'],
            roleWords: ['coding', 'developer', 'technical', 'program', 'software', 'engineer'],
            tools: [],
        },
        Scout: {
            names: ['scout', 'researcher'],
            roleWords: ['research', 'search', 'web', 'investigate'],
            tools: ['web_search', 'news_fetch'],
        },
        Lens: {
            names: ['lens', 'summary', 'summarizer'],
            roleWords: ['summary', 'summar', 'distill', 'analysis'],
            tools: ['summarizer'],
        },
        Atlas: {
            names: ['atlas', 'calculator', 'finance'],
            roleWords: ['calculator', 'data', 'math', 'financial', 'analysis'],
            tools: ['calculator', 'currency_converter'],
        },
        Sage: {
            names: ['sage', 'planner', 'strategy'],
            roleWords: ['plan', 'task', 'strategy', 'roadmap'],
            tools: ['todo'],
        },
        Quill: {
            names: ['quill', 'writer', 'email'],
            roleWords: ['email', 'writer', 'draft', 'content'],
            tools: ['email_draft'],
        },
        Hermes: {
            names: ['hermes', 'scheduler', 'delivery'],
            roleWords: ['schedule', 'automation', 'delivery'],
            tools: ['scheduler'],
        },
    };

    const resolveAgentId = (canonicalName) => {
        const target = String(canonicalName || '').trim();
        if (!target) return null;
        const targetLower = target.toLowerCase();
        const profile = semanticProfiles[target] || { names: [targetLower], roleWords: [], tools: [] };

        const exact = normalizedAgents.find((agent) => agent.name === targetLower);
        if (exact?.id) return exact.id;

        const byAlias = normalizedAgents.find((agent) => profile.names.some((alias) => alias && agent.name.includes(alias)));
        if (byAlias?.id) return byAlias.id;

        const byTool = normalizedAgents.find((agent) => profile.tools.some((tool) => tool && agent.tools.includes(tool)));
        if (byTool?.id) return byTool.id;

        const byRole = normalizedAgents.find((agent) =>
            profile.roleWords.some((word) => word && (agent.role.includes(word) || agent.category.includes(word)))
        );
        if (byRole?.id) return byRole.id;

        return null;
    };

    // Keywords
    const emailKw = /email|send to|notify|mail|digest|forward|share with|cc|update me|let me know|ping|alert|inform|send report/;
    const searchKw = /search|find|latest|news|today|research|look up|what is|check|get|fetch|retrieve|explore|discover|scan|monitor|track|overview of|tell me about|who is|when did|where is|show me|compare/;
    const summarizeKw = /summarize|summary|key points|condense|tldr|brief me|give me a summary|wrap up|overview|highlights|main points|short version|in a nutshell|break down|explain/;
    const calculateKw = /calculate|percent|roi|profit|loss|interest|budget|cost|price|rupees|dollars|how much|revenue|growth|valuation|market cap|margin|expense|salary|tax|cagr|compound|rate|conversion|currency|exchange rate|spending|forecast|estimate|quota|target|kpi|metrics|numbers|financial|total|average|breakdown/;
    const planKw = /plan|schedule|roadmap|steps|how to|todo|action items|launch|strategy|approach|prepare|organize|outline|structure|next steps|priorities|goals|objectives|sprint|backlog|checklist|workflow|process/;
    const projectKw = /project|kickoff|timeline|milestone|manage|team|assign|delegate|resource|deliverable|due date|deadline|phase|scope|stakeholder|review|status|progress|report/;
    const writeKw = /write|draft|compose|create|generate|produce|craft|format|prepare|document|blog|post|article|report|letter|proposal|content/;
    const codeKw = /code|coding|program|developer|debug|bug|fix|error|stack trace|exception|refactor|implementation|build app|build feature|react|node|javascript|typescript|python|java|api|backend|frontend|database schema|sql|algorithm|deploy|test cases?/;
    const translateKw = /translate|in spanish|in french|in hindi|in german|in chinese|convert language|multilingual/;
    const verbLikeKw = /\b(get|find|check|make|create|do|run|fetch|show|tell|give)\b/;

    const hasEmail = emailKw.test(t);
    const hasSearch = searchKw.test(t);
    const hasSummarize = summarizeKw.test(t);
    const hasCalculate = calculateKw.test(t);
    const hasPlan = planKw.test(t);
    const hasProject = projectKw.test(t);
    const hasWrite = writeKw.test(t);
    const hasCode = codeKw.test(t);
    const hasTranslate = translateKw.test(t);

    // Helper to return valid detection object
    const result = (agentNames, label, confidence = 0.75, matchedBy = 'heuristic') => {
        const resolvedAgents = agentNames.map((name) => ({ name, id: resolveAgentId(name) }));
        const filteredAgents = Array.from(new Set(resolvedAgents.map((a) => a.id).filter(Boolean)));

        // Soft fallback: if nothing resolves, pick stable generalist defaults from available roster.
        if (filteredAgents.length === 0 && normalizedAgents.length > 0) {
            const fallbackIds = ['Forge', 'Scout', 'Lens']
                .map((name) => resolveAgentId(name))
                .filter(Boolean);
            if (fallbackIds.length > 0) {
                return {
                    agents: Array.from(new Set(fallbackIds.slice(0, 2))),
                    label: 'General task intelligence',
                    confidence: 0.45,
                    matchedBy: 'safe-fallback',
                };
            }
        }

        if (import.meta.env?.DEV && filteredAgents.length < agentNames.length) {
            const missingAgents = resolvedAgents.filter((a) => !a.id).map((a) => a.name);
            console.warn('[detectPipeline] Missing agents for recommendation:', missingAgents);
        }

        return {
            agents: filteredAgents,
            label,
            confidence,
            matchedBy,
        };
    };
    // 0. THE FULL PIPELINE — all signals present
    if (hasSearch && hasSummarize && hasCalculate && hasPlan && hasEmail) {
        return result(
            ['Scout', 'Lens', 'Atlas', 'Sage', 'Quill', 'Hermes'],
            'Full research, summarize, analyze, plan and report',
            0.98,
            'full-pipeline'
        );
    }
    // 1. Most specific: Search + Calculate + Plan + Email
    if (hasSearch && hasCalculate && hasPlan && hasEmail) {
        return result(
            ['Scout', 'Lens', 'Atlas', 'Sage', 'Quill', 'Hermes'],
            'Full research, analysis, plan and report',
            0.95,
            'research+calculate+plan+delivery'
        );
    }
    // 2. Research + Calculate + Email
    if (hasSearch && hasCalculate && hasEmail) {
        return result(
            ['Scout', 'Lens', 'Atlas', 'Quill', 'Hermes'],
            'Research, analyze, draft and send email',
            0.92,
            'research+calculate+delivery'
        );
    }
    if (hasCode && hasEmail) {
        return result(['Forge', 'Quill', 'Hermes'], 'Build, draft and send', 0.94, 'code+delivery');
    }

    if (hasCode) {
        return result(['Forge'], 'Coding and technical guidance', 0.92, 'code');
    }

    // 1. Most specific: Search + Calculate + Plan + Email
    if (hasSearch && hasCalculate && hasPlan && hasEmail) {
        return result(['Scout', 'Atlas', 'Sage', 'Quill', 'Hermes'], 'Full research, analysis, plan and report', 0.95, 'research+calculate+plan+delivery');
    }

    // 2. Research + Calculate + Email
    if (hasSearch && hasCalculate && hasEmail) {
        return result(['Scout', 'Atlas', 'Quill', 'Hermes'], 'Research, analyze, draft and send email', 0.92, 'research+calculate+delivery');
    }

    // 3. Research + Summarize + Email
    if (hasSearch && hasSummarize && hasEmail) {
        return result(['Scout', 'Lens', 'Quill', 'Hermes'], 'Search, summarize, draft and send email', 0.92, 'research+summary+delivery');
    }

    // 4. Research + Plan + Email
    if (hasSearch && hasPlan && hasEmail) {
        return result(['Scout', 'Sage', 'Quill', 'Hermes'], 'Research, plan and send report', 0.9, 'research+plan+delivery');
    }

    // 5. Calculate + Plan + Email
    if (hasCalculate && hasPlan && hasEmail) {
        return result(['Atlas', 'Sage', 'Quill', 'Hermes'], 'Analyze, plan and send report', 0.9, 'calculate+plan+delivery');
    }

    // 6. Project + Email
    if (hasProject && hasEmail) {
        return result(['Sage', 'Quill', 'Hermes'], 'Plan and send project report', 0.88, 'project+delivery');
    }

    // 7. Research + Email
    if (hasSearch && hasEmail) {
        return result(['Scout', 'Quill', 'Hermes'], 'Research, draft and send email', 0.86, 'research+delivery');
    }

    // 8. Calculate + Email
    if (hasCalculate && hasEmail) {
        return result(['Atlas', 'Quill', 'Hermes'], 'Calculate, draft and send email', 0.86, 'calculate+delivery');
    }

    // 9. Write + Email
    if (hasWrite && hasEmail) {
        return result(['Quill', 'Hermes'], 'Draft and send', 0.84, 'writing+delivery');
    }

    // 10. Research + Calculate
    if (hasSearch && hasCalculate) {
        return result(['Scout', 'Atlas'], 'Research and analyze data', 0.84, 'research+calculate');
    }

    // 11. Research + Plan
    if (hasSearch && hasPlan) {
        return result(['Scout', 'Sage'], 'Research and plan', 0.82, 'research+plan');
    }

    // 12. Calculate + Plan
    if (hasCalculate && hasPlan) {
        return result(['Atlas', 'Sage'], 'Analyze and plan', 0.82, 'calculate+plan');
    }

    // 13. Research + Summarize
    if (hasSearch && hasSummarize) {
        return result(['Scout', 'Lens'], 'Search and summarize', 0.82, 'research+summary');
    }

    // 14. Single Research
    if (hasSearch) {
        return result(['Scout'], 'Web research', 0.78, 'research');
    }

    // 15. Single Summarize
    if (hasSummarize) {
        return result(['Lens'], 'Summarize content', 0.76, 'summary');
    }

    // 16. Single Calculate
    if (hasCalculate) {
        return result(['Atlas'], 'Calculate and analyze', 0.76, 'calculate');
    }

    // 17. Single Plan
    if (hasPlan) {
        return result(['Sage'], 'Create action plan', 0.74, 'plan');
    }

    // 18. Single Project
    if (hasProject) {
        return result(['Sage'], 'Project planning', 0.74, 'project');
    }

    // 19. Single Write
    if (hasWrite) {
        return result(['Quill'], 'Draft content', 0.72, 'writing');
    }

    // 20. Default
    if (task.length > 40 && (verbLikeKw.test(t) || hasTranslate)) {
        return result(['Scout', 'Lens'], 'General research and summary', 0.62, 'fallback');
    }

    return null;
};
