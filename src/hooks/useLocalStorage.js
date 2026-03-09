import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { setAgents } from '../store/agentsSlice';
import { reorderPipeline } from '../store/pipelineSlice';
import { addCompletedTask } from '../store/taskSlice';
import { defaultAgents } from '../constants/defaultAgents';
import api from '../services/api';

const AGENT_VERSION = "v2.0";

export function useLocalStorage() {
  const dispatch = useAppDispatch();
  const agents = useAppSelector((state) => state.agents.agents);
  const pipeline = useAppSelector((state) => state.pipeline.pipeline);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  const hasInitialized = useRef(false);
  const lastSyncedAgents = useRef(null);
  const agentSyncTimer = useRef(null);
  const pipelineSyncTimer = useRef(null);

  // ── On mount: load from localStorage as instant cache ──────────────────────
  useEffect(() => {
    // 1. Version Check & Cache Clearing
    const currentVersion = localStorage.getItem('agentforge_version');
    if (currentVersion !== AGENT_VERSION) {
      console.warn(`[useLocalStorage] Stale data detected (found: ${currentVersion}, need: ${AGENT_VERSION}). Resetting to default agents.`);
      localStorage.clear();
      dispatch(setAgents([...defaultAgents]));
      localStorage.setItem('agentforge_version', AGENT_VERSION);
    }

    // 2. Normal Restore
    const savedAgents = localStorage.getItem('agentforge_agents');
    if (savedAgents) {
      try {
        const parsed = JSON.parse(savedAgents);
        if (Array.isArray(parsed) && parsed.length > 0) dispatch(setAgents(parsed));
      } catch (err) {
        console.error('Failed to parse agents from localStorage', err);
      }
    }

    const savedPipeline = localStorage.getItem('agentforge_pipeline');
    if (savedPipeline) {
      try {
        const parsed = JSON.parse(savedPipeline);
        if (Array.isArray(parsed)) dispatch(reorderPipeline(parsed));
      } catch (err) {
        console.error('Failed to parse pipeline from localStorage', err);
      }
    }
  }, [dispatch]);

  // ── When authenticated: fetch authoritative data from MongoDB ───────────────
  useEffect(() => {
    if (!isAuthenticated || hasInitialized.current) return;
    hasInitialized.current = true;

    const initFromDB = async () => {
      try {
        // 1. Fetch agents
        const agentsRes = await api.get('/api/user/agents');
        const dbAgents = agentsRes.data.agents;

        if (dbAgents && dbAgents.length > 0) {
          const VALID_DEFAULT_IDS = ['agent-scout', 'agent-quill', 'agent-sage', 'agent-atlas', 'agent-max'];
          const VALID_DEFAULT_NAMES = ['Scout', 'Quill', 'Sage', 'Atlas', 'Max'];

          const validAgents = dbAgents.filter(a =>
            VALID_DEFAULT_IDS.includes(a.id || a._id) ||
            VALID_DEFAULT_NAMES.includes(a.name) ||
            (!a.isDefault && new Date(a.createdAt) > new Date('2025-01-01'))
          );

          const agentsToLoad = validAgents.length > 0 ? validAgents : defaultAgents;

          // Deduplicate by name (frontend safety net) — prefer isDefault, then earliest createdAt
          const nameMap = new Map();
          for (const agent of agentsToLoad) {
            const key = agent.name.toLowerCase();
            if (!nameMap.has(key)) {
              nameMap.set(key, agent);
            } else {
              const existing = nameMap.get(key);
              if (agent.isDefault && !existing.isDefault) nameMap.set(key, agent);
            }
          }

          // Normalize: use _id as id for Redux compatibility
          const normalized = Array.from(nameMap.values()).map(a => ({
            ...a,
            id: a._id || a.id,
            memory: a.memory || [],
          }));
          dispatch(setAgents(normalized));
          lastSyncedAgents.current = normalized;
          localStorage.setItem('agentforge_agents', JSON.stringify(normalized));
        }

        // 2. Fetch pipeline
        const pipelineRes = await api.get('/api/user/pipeline');
        const dbPipeline = pipelineRes.data.pipeline?.agentOrder;
        if (dbPipeline && dbPipeline.length > 0) {
          dispatch(reorderPipeline(dbPipeline));
          localStorage.setItem('agentforge_pipeline', JSON.stringify(dbPipeline));
        }

        // 3. Fetch completed tasks
        const tasksRes = await api.get('/api/user/tasks');
        const dbTasks = tasksRes.data.tasks;
        if (dbTasks && dbTasks.length > 0) {
          dbTasks.reverse().forEach(t => dispatch(addCompletedTask(t)));
        }
      } catch (err) {
        console.error('[useLocalStorage] DB init failed:', err.message);
      }
    };

    initFromDB();
  }, [isAuthenticated, dispatch]);

  // ── Watch agents: persist to localStorage + DB (debounced 800ms) ───────────
  useEffect(() => {
    if (agents && agents.length > 0) {
      localStorage.setItem('agentforge_agents', JSON.stringify(agents));
    }

    if (!isAuthenticated || !hasInitialized.current) return;

    clearTimeout(agentSyncTimer.current);
    agentSyncTimer.current = setTimeout(async () => {
      // Simple strategy: sync agents that have a local-only id (no Mongo _id)
      // The PUT endpoint handles updates for DB-backed agents
      // New agents not yet in DB get POSTed
      try {
        const prev = lastSyncedAgents.current || [];
        const prevIds = new Set(prev.map(a => a._id || a.id));

        const newAgents = agents.filter(a => !prevIds.has(a._id || a.id) && !a._id);
        if (newAgents.length > 0) {
          await Promise.all(newAgents.map(a =>
            api.post('/api/user/agents', {
              name: a.name, role: a.role, personality: a.personality,
              tools: a.tools, color: a.color,
            })
          ));
        }
        lastSyncedAgents.current = agents;
      } catch (err) {
        console.error('[useLocalStorage] Agent sync failed:', err.message);
      }
    }, 800);
  }, [agents, isAuthenticated]);

  // ── Watch pipeline: persist to localStorage + DB (debounced 500ms) ─────────
  useEffect(() => {
    localStorage.setItem('agentforge_pipeline', JSON.stringify(pipeline));

    if (!isAuthenticated || !hasInitialized.current) return;

    clearTimeout(pipelineSyncTimer.current);
    pipelineSyncTimer.current = setTimeout(async () => {
      try {
        await api.put('/api/user/pipeline', { agentOrder: pipeline });
      } catch (err) {
        console.error('[useLocalStorage] Pipeline sync failed:', err.message);
      }
    }, 500);
  }, [pipeline, isAuthenticated]);
}
