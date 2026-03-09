import { useAppDispatch, useAppSelector } from '../store';
import { setIsRunning, setActiveAgent, addCompletedTask, setRightTab } from '../store/taskSlice';
import { addLog, updateLog, clearLogs } from '../store/logsSlice';
import { updateAgentMemory } from '../store/agentsSlice';
import { setActiveSession, addMessageToActiveSession, updateSessionTitle, addSession } from '../store/chatSlice';
import { TOOLS } from '../constants/tools';
import * as api from '../services/api';
import apiClient from '../services/api';
import toast from 'react-hot-toast';




function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function formatTime(date) {
  return date.toISOString();
}

export function useAgentRunner() {
  const dispatch = useAppDispatch();
  const pipeline = useAppSelector((state) => state.pipeline.pipeline);
  const agents = useAppSelector((state) => state.agents.agents);
  const taskGoal = useAppSelector((state) => state.task.taskGoal);
  const isRunning = useAppSelector((state) => state.task.isRunning);
  const selectedLanguage = useAppSelector((state) => state.language.selectedLanguage);
  const activeSessionId = useAppSelector((state) => state.chat.activeSessionId);
  const sessions = useAppSelector((state) => state.chat.sessions);

  // Generates a role-specific instruction for each step in the pipeline.
  // First agent always gets the full goal. Subsequent agents get instructions based on their tools and previous output.
  const generateAgentInstruction = (agent, taskGoal, stepIndex, totalSteps, previousOutputs) => {
    if (stepIndex === 0) return taskGoal;

    const last = previousOutputs[previousOutputs.length - 1];
    const prevContext = last ? last.output.substring(0, 1000) : '';
    const tools = agent.tools || [];

    // Special handling for Hermes (Scheduler)
    if (agent.name === 'Hermes' || tools.includes('scheduler')) {
      const quillOutput = [...previousOutputs].reverse().find(o => o.agentName === 'Quill');
      if (quillOutput) {
        return `Here is the email drafted by Quill — take this exact content and pass it to your scheduler tool as emailContent and send it to the recipient. Do not rewrite or modify the email. Just deliver it.\n\nQUILL DRAFT:\n${quillOutput.output}`;
      }
      return `I need Quill's email draft before I can send. Please check the pipeline. Current context: ${prevContext}`;
    }

    const contextBlock = `--- PREVIOUS AGENT OUTPUT (${last?.agentName || 'Previous Agent'}) ---\n${prevContext}\n---`;

    if (tools.includes('email_draft') && !tools.includes('web_search')) {
      return `${contextBlock}\n\nYour task: Write a professional email using the research above. Do NOT search for anything — the research is already complete. Focus entirely on writing a clear, compelling, ready-to-send email.`;
    }

    if (tools.includes('todo') && !tools.includes('web_search')) {
      return `${contextBlock}\n\nYour task: Create a detailed, actionable plan or to-do list based on the work above. Do NOT search for anything. Convert the findings into clear, prioritized action items.`;
    }

    if (tools.includes('summarizer') && !tools.includes('web_search') && !tools.includes('calculator') && !tools.includes('email_draft') && !tools.includes('todo')) {
      return `${contextBlock}\n\nYour task: Summarize and synthesize the information above into clear, concise key points. Distill the most important insights.`;
    }

    if (tools.includes('calculator')) {
      return `${contextBlock}\n\nYour task: Analyze the numerical data above and perform any relevant calculations needed to deliver insight. Show your methodology.`;
    }

    // Generic fallback for any other tool combination
    return `${contextBlock}\n\nYour task: Continue from where the previous agent left off. Apply your full expertise as ${agent.role}. Original goal for reference: ${taskGoal}`;
  };

  // speak is an optional callback injected from useVoiceAgent to avoid circular imports.
  // Defaults to a no-op so the runner works fine without voice.
  const executePipeline = async ({ speak = null } = {}) => {
    const sayAloud = typeof speak === 'function' ? speak : () => { };

    // Guard clause
    if (taskGoal.trim() === '' || pipeline.length === 0 || isRunning === true) {
      return;
    }

    // Initial setup
    dispatch(setIsRunning(true));

    // Pipeline Validation for Hermes/Email
    const hermesIndex = pipeline.findIndex(id => {
      const a = agents.find(ag => ag.id === id);
      return a?.name === 'Hermes';
    });

    if (hermesIndex !== -1) {
      const quillExists = pipeline.some(id => agents.find(ag => ag.id === id)?.name === 'Quill');
      if (!quillExists) {
        const quill = agents.find(a => a.name === 'Quill');
        if (quill) {
          // Auto-insert Quill before Hermes
          const newPipeline = [...pipeline];
          newPipeline.splice(hermesIndex, 0, quill.id);
          // We can't easily dispatch to update the pipeline state here if it's external,
          // but we can modify our local 'pipeline' variable for this run.
          // However, the instructions say "automatically insert Quill at the second to last position before Hermes"
          // Let's modify the local copy for execution.
          pipeline.splice(hermesIndex, 0, quill.id);
          toast.success('Added Quill to pipeline for professional email formatting.');
        } else {
          toast.error('Email pipelines require Quill (Email Writer) before Hermes.');
          dispatch(setIsRunning(false));
          return;
        }
      }

      const specialistExists = pipeline.slice(0, hermesIndex).some(id => {
        const a = agents.find(ag => ag.id === id);
        return a && a.name !== 'Quill' && a.name !== 'Hermes';
      });
      if (!specialistExists) {
        toast.error('Email pipelines require at least one content agent before Hermes.');
        dispatch(setIsRunning(false));
        return;
      }
    }

    dispatch(clearLogs());

    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      const pipelineAgents = pipeline.map(id => {
        const ag = agents.find(a => a.id === id);
        return ag ? { agentId: ag.id, agentName: ag.name, agentColor: ag.color } : null;
      }).filter(Boolean);

      try {
        const result = await api.createChatSession({ taskGoal, pipelineAgents });
        currentSessionId = result.sessionId;
        dispatch(addSession(result.session));
        dispatch(setActiveSession(currentSessionId));
      } catch (err) {
        console.error("Failed to create chat session", err);
      }
    }

    if (currentSessionId) {
      const userMsg = {
        id: generateId(),
        role: 'user',
        content: taskGoal,
        timestamp: new Date().toISOString()
      };
      dispatch(addMessageToActiveSession(userMsg));
      api.addChatMessage(currentSessionId, userMsg).catch(console.error);
    }

    let currentLogs = [];
    const pushLog = (entry) => {
      const logWithMeta = {
        ...entry,
        id: generateId(),
        timestamp: formatTime(new Date()),
      };
      currentLogs.push(logWithMeta);
      dispatch(addLog(logWithMeta));
      return logWithMeta.id;
    };

    const initPfx = selectedLanguage !== 'en' ? await api.translate('Pipeline initiated — ', selectedLanguage) : 'Pipeline initiated — ';
    const initSfx = selectedLanguage !== 'en' ? await api.translate(` agents — Goal: ${taskGoal.substring(0, 80)}...`, selectedLanguage) : ` agents — Goal: ${taskGoal.substring(0, 80)}...`;

    pushLog({
      type: 'system',
      content: `${initPfx}${pipeline.length}${initSfx}`,
    });

    // Narrate pipeline start
    sayAloud(`Pipeline initiated. I'll narrate each step as your ${pipeline.length} agent${pipeline.length > 1 ? 's' : ''} work through the task.`);

    // Initialize context
    const contextHistory = [];
    let fullFinalOutput = "TASK: " + taskGoal;
    const agentColors = [];
    let allFailed = true;

    // Start a for loop over pipeline
    for (let i = 0; i < pipeline.length; i++) {
      // Find agent
      const agent = agents.find(a => a.id === pipeline[i]);
      if (!agent) continue;

      // Build role-specific instruction for this agent based on its tools and previous outputs
      const agentInstruction = generateAgentInstruction(agent, taskGoal, i, pipeline.length, contextHistory);

      // Build full context string: agent instruction + recent history for LLM
      let agentContext = agentInstruction;

      // For downstream agents (i > 0), context history is already embedded inside agentInstruction.
      // For the first agent, we still check if there's extra history to append.
      if (i === 0 && contextHistory.length > 0) {
        const recentHistory = contextHistory.slice(-2);
        agentContext += `\n\nRECENT ACTIVITY:\n` + recentHistory.map(entry => {
          let out = entry.output;
          if (out.length > 800) out = out.substring(0, 800) + "...";
          return `AGENT ${entry.agentName.toUpperCase()} OUTPUT: \n${out}`;
        }).join('\n\n');
      }

      agentColors.push(agent.color);
      dispatch(setActiveAgent(agent.id));

      const tActionPfx = selectedLanguage !== 'en' ? await api.translate(`Agent ${agent.name} — ${agent.role} — Step `, selectedLanguage) : `Agent ${agent.name} — ${agent.role} — Step `;
      const tActionSfx = selectedLanguage !== 'en' ? await api.translate(` of ${pipeline.length}`, selectedLanguage) : ` of ${pipeline.length}`;

      pushLog({
        type: 'action',
        agentName: agent.name,
        agentColor: agent.color,
        content: `${tActionPfx}${i + 1}${tActionSfx}`
      });



      const tThinkingStr = selectedLanguage !== 'en' ? await api.translate(`Analyzing task context and preparing ${agent.role} perspective...`, selectedLanguage) : `Analyzing task context and preparing ${agent.role} perspective...`;

      pushLog({
        type: 'thinking',
        agentName: agent.name,
        agentColor: agent.color,
        content: tThinkingStr
      });



      // Tool invocation logs & execution
      if (agent.tools && agent.tools.length > 0) {
        for (const toolId of agent.tools) {
          const tool = TOOLS.find(t => t.id === toolId);
          if (!tool) continue;

          const tToolStr = selectedLanguage !== 'en' ? await api.translate(`Invoking ${tool.name}...`, selectedLanguage) : `Invoking ${tool.name}...`;
          pushLog({
            type: 'tool',
            agentName: agent.name,
            agentColor: agent.color,
            content: `${tool.icon} ${tToolStr}`
          });

          // Actually execute the specific tool
          try {
            let toolResultContent = "";
            if (toolId === 'web_search') {
              const data = await api.searchWeb(taskGoal);
              if (data && data.results && data.results.length > 0) {
                toolResultContent = data.results.map(r => `• ${r.title}: ${r.snippet}`).join('\n');
              }
            } else if (toolId === 'calculator') {
              const res = await api.calculate(taskGoal);
              if (res) toolResultContent = res;
            } else if (toolId === 'summarize') {
              const res = await api.summarize(taskGoal);
              if (res) toolResultContent = res;
            } else if (toolId === 'email_draft') {
              const res = await api.draftEmail("Automated Draft", taskGoal);
              if (res) toolResultContent = res;
            } else if (toolId === 'todo') {
              const res = await api.extractTodos(taskGoal);
              if (res) toolResultContent = res;
            } else if (toolId === 'scheduler') {
              // Extract data for scheduler
              const emailMatch = taskGoal.match(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/);
              const recipient = emailMatch ? emailMatch[0] : '';

              const quillOutput = [...contextHistory].reverse().find(o => o.agentName === 'Quill');
              const lastNonHermes = [...contextHistory].reverse().find(o => o.agentName !== 'Hermes');

              const schedulerPayload = {
                taskDescription: taskGoal,
                recipientEmail: recipient,
                cronExpression: '0 9 * * *', // Default
                agentId: agent.id,
                emailContent: quillOutput?.output || '',
                previousAgentOutput: lastNonHermes?.output || ''
              };

              const res = await apiClient.post('/api/tools/scheduler', schedulerPayload);
              if (res.data) toolResultContent = res.data.message || 'Schedule created';
            }

            // Inject the result precisely labeled for the LLM context limits
            if (toolResultContent) {
              const labeledInjection = `\n\nTOOL RESULT from ${tool.name}:\n${toolResultContent}`;
              agentContext += labeledInjection;
              fullFinalOutput += labeledInjection;
            }

          } catch (error) {
            console.error(`Tool execution error for ${toolId}:`, error);
          }
        }
      }

      // Cap context to 1600 characters max
      if (agentContext.length > 1600) {
        agentContext = agentContext.substring(0, 1600) + "\n...[Context truncated for brevity]";
      }

      // Real agent API call via Streaming
      try {
        const streamPayload = {
          agentId: agent.id,
          taskGoal: taskGoal,
          agentName: agent.name,
          role: agent.role,
          personality: agent.personality,
          tools: agent.tools,
          context: agentContext,
          stepNumber: i + 1,
          totalSteps: pipeline.length
        };

        // Create the empty log entry that will be streamed into
        const streamLogId = pushLog({
          type: 'output',
          agentName: agent.name,
          agentColor: agent.color,
          content: ''
        });

        let accumulatedContent = '';

        // Wrap stream in a Promise so we can await it
        let output = await new Promise((resolve, reject) => {
          api.runAgentStream(
            streamPayload,
            (token) => {
              accumulatedContent += token;
              // Update log in Redux
              dispatch(updateLog({ id: streamLogId, content: accumulatedContent }));

              // Also update local currentLogs array for when we save to DB later
              const localLogIndex = currentLogs.findIndex(l => l.id === streamLogId);
              if (localLogIndex !== -1) {
                currentLogs[localLogIndex] = { ...currentLogs[localLogIndex], content: accumulatedContent };
              }
            },
            (fullText) => {
              resolve(fullText);
            }
          );
        });

        contextHistory.push({ agentName: agent.name, output: output });
        fullFinalOutput += `\n\n━━ ${agent.name.toUpperCase()} — ${agent.role} ━━\n${output}`;

        const toolsUsedNames = (agent.tools || []).map(tId => {
          const t = TOOLS.find(x => x.id === tId);
          return t ? t.name : tId;
        }).filter(Boolean);

        const memoryEntry = {
          goal: taskGoal,
          summary: output.length > 200 ? output.substring(0, 200) + '...' : output,
          fullOutput: output,
          timestamp: new Date().toISOString(),
          toolsUsed: toolsUsedNames,
          stepNumber: i + 1,
        };

        dispatch(updateAgentMemory({ id: agent.id, entry: memoryEntry }));

        const updatedMemory = [...(agent.memory || []), memoryEntry];
        if (updatedMemory.length > 20) updatedMemory.shift();
        apiClient.put(`/api/user/agents/${agent.id}`, { memory: updatedMemory }).catch(err => console.warn('DB Memory save failed:', err));

        if (currentSessionId) {
          const assistantMsg = {
            id: generateId(),
            role: 'assistant',
            agentName: agent.name,
            agentColor: agent.color,
            content: output,
            toolsUsed: toolsUsedNames,
            timestamp: new Date().toISOString()
          };
          dispatch(addMessageToActiveSession(assistantMsg));
          api.addChatMessage(currentSessionId, assistantMsg).catch(console.error);
        }

        // Narrate agent completion — mention next agent if not last
        const isLastAgent = i === pipeline.length - 1;
        if (isLastAgent) {
          sayAloud(`Agent ${agent.name} has completed the final step.`);
        } else {
          const nextAgent = agents.find(a => a.id === pipeline[i + 1]);
          const nextName = nextAgent ? nextAgent.name : 'the next agent';
          sayAloud(`Agent ${agent.name} has finished. Passing insights to ${nextName}.`);
        }

        // Remove the old stale TTS call that used api.speak directly
        allFailed = false;

      } catch (error) {
        const errorStr = selectedLanguage !== 'en' ? await api.translate(`Error running ${agent.name}: ${error.message}`, selectedLanguage) : `Error running ${agent.name}: ${error.message}`;
        pushLog({
          type: 'error',
          agentName: agent.name,
          agentColor: '#f87171',
          content: errorStr
        });
        continue;
      }


    } // end for loop

    // After the for loop
    dispatch(setActiveAgent(null));
    dispatch(setIsRunning(false));

    if (allFailed && pipeline.length > 0) {
      const errFail = selectedLanguage !== 'en' ? await api.translate(`Error: Pipeline failed. All agents encountered errors.`, selectedLanguage) : `Error: Pipeline failed. All agents encountered errors.`;

      pushLog({
        type: 'error',
        agentName: 'System',
        agentColor: '#f87171',
        content: errFail
      });
      toast.error('Pipeline failed: All agents encountered errors.');
      return;
    }

    let finalMsg = `✓ Pipeline complete. All ${pipeline.length} agents processed the task.`;

    if (selectedLanguage !== 'en') {
      try {
        finalMsg = await api.translate(finalMsg, selectedLanguage);
      } catch (err) { }
    }

    pushLog({
      type: 'system',
      content: finalMsg,
      languageNote: selectedLanguage !== 'en' ? selectedLanguage : null
    });

    if (currentSessionId) {
      const activeSess = sessions.find(s => s.sessionId === currentSessionId);
      if (!activeSess || activeSess.title === 'New Session') {
        const newTitle = taskGoal.substring(0, 40);
        api.updateChatTitle(currentSessionId, newTitle).catch(console.error);
        dispatch(updateSessionTitle({ sessionId: currentSessionId, title: newTitle }));
      }
    }

    // Narrate pipeline completion
    sayAloud(`All done. Your ${pipeline.length} agent${pipeline.length > 1 ? 's' : ''} have finished. Check the activity log for the full breakdown.`);

    const pipelineStartTime = Date.now();

    dispatch(setRightTab("log"));

    const taskPayload = {
      taskGoal,
      pipeline,
      completedAt: new Date().toISOString(),
      logs: currentLogs,
      finalOutput: fullFinalOutput,
      agentColors,
      logsJson: currentLogs,
      agentCount: pipeline.length,
      durationMs: Date.now() - pipelineStartTime,
    };

    // Auto-email detection
    const emailMatch = taskGoal.match(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      const recipient = emailMatch[0];
      const finalAgentOutput = contextHistory[contextHistory.length - 1]?.output || '';

      const subjectMatch = finalAgentOutput.match(/Subject:\s*(.*)/i);
      const subject = subjectMatch ? subjectMatch[1].trim() : taskGoal.substring(0, 50);

      const htmlBody = finalAgentOutput.split('\n').map(line => `<p>${line}</p>`).join('');

      try {
        await api.sendEmail({
          to: recipient,
          subject: subject,
          body: htmlBody
        });

        pushLog({
          type: 'system',
          agentName: 'System',
          agentColor: 'green',
          content: `Email sent successfully to ${recipient}`
        });
      } catch (err) {
        pushLog({
          type: 'system',
          agentName: 'System',
          agentColor: 'red',
          content: `Email failed to send with the error: ${err.message}`
        });
      }
    }

    // Dispatch to Redux immediately with a local id
    dispatch(addCompletedTask({ id: generateId(), ...taskPayload }));

    // Persist to MongoDB in the background (don't block the UI)
    try {
      const { data } = await apiClient.post('/api/user/tasks', {

        taskGoal,
        finalOutput: fullFinalOutput,
        logsJson: currentLogs,
        agentCount: pipeline.length,
        durationMs: taskPayload.durationMs,
      });
      if (data?.task) {
        // Update Redux entry with the server-assigned _id so we can delete from DB
        import('../store/taskSlice').then(({ updateTaskDbId }) => {
          dispatch(updateTaskDbId({ localId: taskPayload.id || '', dbId: data.task._id }));
        });
      }
    } catch (err) {
      console.warn('[useAgentRunner] Failed to persist task to DB:', err.message);
    }
  };


  return { executePipeline };
}
