import { useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { setIsRunning, setActiveAgent, addCompletedTask, setRightTab, setPipelineResult, setLastVoiceResult, setLastFailedAtStep } from '../store/taskSlice';
import { addLog, updateLog, clearLogs } from '../store/logsSlice';
import { updateAgentMemory } from '../store/agentsSlice';
import { setActiveSession, addMessageToActiveSession, updateSessionTitle, addSession } from '../store/chatSlice';
import { TOOLS } from '../constants/tools';
import * as api from '../services/api';
import apiClient from '../services/api';
import toast from 'react-hot-toast';
import { speak as browserSpeak } from '../utils/speak';

const SCOUT_MINIMAL_FALLBACK_PERSONALITY = 'You are Scout, a web researcher. Always use web search results provided in context, cite sources, and present factual findings clearly.';
const QUILL_MINIMAL_FALLBACK_PERSONALITY = 'You are Quill, a professional email writer. You never refuse. Write a complete ready-to-send email using the provided information.';
const SAGE_MINIMAL_FALLBACK_PERSONALITY = 'You are Sage, a task planner. Convert provided context into actionable prioritized steps.';
const ATLAS_MINIMAL_FALLBACK_PERSONALITY = 'You are Atlas, a calculator. Show formulas, values, and results clearly.';
const LENS_MINIMAL_FALLBACK_PERSONALITY = 'You are Lens, a summarizer. Extract exactly 5 key insights and one bottom line.';
const HERMES_MINIMAL_FALLBACK_PERSONALITY = 'You are Hermes, a scheduler. Deliver or schedule based on provided context.';
const FORGE_MINIMAL_FALLBACK_PERSONALITY = 'You are Forge, a universal coding copilot. Write code, debug issues, explain technical concepts, guide implementation, and give practical step-by-step help. Prefer concrete answers, complete examples, and implementation-ready output.';

const AGENT_PERSONALITY_FALLBACKS = {
  Forge: FORGE_MINIMAL_FALLBACK_PERSONALITY,
  Scout: SCOUT_MINIMAL_FALLBACK_PERSONALITY,
  Quill: QUILL_MINIMAL_FALLBACK_PERSONALITY,
  Sage: SAGE_MINIMAL_FALLBACK_PERSONALITY,
  Atlas: ATLAS_MINIMAL_FALLBACK_PERSONALITY,
  Lens: LENS_MINIMAL_FALLBACK_PERSONALITY,
  Hermes: HERMES_MINIMAL_FALLBACK_PERSONALITY,
};




function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function formatTime(date) {
  return date.toISOString();
}

function parseTodoLines(todoText) {
  return String(todoText || '')
    .split('\n')
    .map(line => line.trim())
    .filter(line =>
      // Checkbox emojis (with or without variation selector)
      /^[✅☑✔️]/u.test(line) ||
      // Numbered lists: "1.", "2)", "3-", "Step 1:"
      /^\d+[.):\-]\s+\S/.test(line) ||
      // Markdown task list
      /^[-*]\s+\[[ xX]\]/.test(line)
    )
    // Strip leading bullets/checkboxes so calendar item text is clean
    .map(line => line.replace(/^[✅☑✔️\s]+/, '').replace(/^\d+[.):\-]\s+/, '').trim())
    .filter(Boolean);
}

export function useAgentRunner() {
  const dispatch = useAppDispatch();
  const pipeline = useAppSelector((state) => state.pipeline.pipeline);
  const agents = useAppSelector((state) => state.agents.agents);
  const taskGoal = useAppSelector((state) => state.task.taskGoal);
  const isRunning = useAppSelector((state) => state.task.isRunning);
  const selectedLanguage = useAppSelector((state) => state.language.selectedLanguage);
  const isVoiceMuted = useAppSelector((state) => state.voice.isMuted);
  const googleCalendarConnected = useAppSelector((state) => state.auth.googleCalendarConnected);
  const userPreferences = useAppSelector((state) => state.auth.userPreferences);
  const notificationSettings = useAppSelector((state) => state.auth.notifications);
  const recipientEmail = useAppSelector((state) => state.task.recipientEmail);
  const toolAttachments = useAppSelector((state) => state.task.toolAttachments);
  const activeSessionId = useAppSelector((state) => state.chat.activeSessionId);
  const sessions = useAppSelector((state) => state.chat.sessions);
  const stopRequestedRef = useRef(false);

  const hasAnyKeyword = (text, keywords = []) => {
    const t = String(text || '').toLowerCase();
    return keywords.some((k) => t.includes(k));
  };

  const parseMaybeJsonData = (raw) => {
    if (!raw) return null;
    const text = String(raw).trim();
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  const extractDataArrayFromTask = (text) => {
    const t = String(text || '');
    const m = t.match(/\[[\s\S]*\]/);
    if (!m) return null;
    try {
      const parsed = JSON.parse(m[0].replace(/'/g, '"'));
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  const extractCurrencyRequestFromTask = (text) => {
    const t = String(text || '').toUpperCase();
    const m = t.match(/(\d+(?:\.\d+)?)\s*([A-Z]{3})\s*(?:TO|IN)\s*([A-Z]{3})/);
    if (!m) return null;
    return { amount: Number(m[1]), from: m[2], to: m[3] };
  };

  // DISABLED — re-enable when ready to implement
  // const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  //   const reader = new FileReader();
  //   reader.onload = () => resolve(String(reader.result || ''));
  //   reader.onerror = reject;
  //   reader.readAsDataURL(blob);
  // });

  // DISABLED — re-enable when ready to implement
  // const resolveImageAttachmentToBase64 = async (attachment) => {
  //   if (!attachment) return '';
  //   if (typeof attachment === 'string') {
  //     const raw = attachment.trim();
  //     if (!raw) return '';
  //     if (raw.startsWith('blob:')) {
  //       const blobResp = await fetch(raw);
  //       const blob = await blobResp.blob();
  //       const asDataUrl = await blobToDataUrl(blob);
  //       return String(asDataUrl.split(',').pop() || '').trim();
  //     }
  //     return String(raw.split(',').pop() || '').trim();
  //   }
  //   if (typeof File !== 'undefined' && attachment instanceof File) {
  //     const asDataUrl = await blobToDataUrl(attachment);
  //     return String(asDataUrl.split(',').pop() || '').trim();
  //   }
  //   if (typeof Blob !== 'undefined' && attachment instanceof Blob) {
  //     const asDataUrl = await blobToDataUrl(attachment);
  //     return String(asDataUrl.split(',').pop() || '').trim();
  //   }
  //   return '';
  // };

  // Generates a role-specific instruction for each step in the pipeline.
  // First agent always gets the full goal. Subsequent agents get instructions based on their tools and previous output.
  const generateAgentInstruction = (agent, taskGoal, stepIndex, totalSteps, previousOutputs, resolvedRecipient) => {
    if (stepIndex === 0) return taskGoal;

    const last = previousOutputs[previousOutputs.length - 1];
    const prevContext = last ? last.output.substring(0, 2000) : '';
    const fullChainContext = previousOutputs
      .map((entry, idx) => {
        const out = String(entry.output || '').substring(0, 2000);
        return `--- PREVIOUS AGENT OUTPUT ${idx + 1}/${previousOutputs.length} (${entry.agentName || 'Agent'}) ---\n${out}\n---`;
      })
      .join('\n\n');
    const tools = agent.tools || [];

    // Special handling for Hermes (Scheduler)
    if (agent.name === 'Hermes' || tools.includes('scheduler')) {
      console.log('[generateAgentInstruction] previousOutputs:', previousOutputs);
      const quillOutput = [...previousOutputs].reverse().find((o) =>
        String(o?.agentName || '').toLowerCase() === 'quill' ||
        String(o?.role || '').toLowerCase().includes('email')
      );
      if (quillOutput) {
        const missingRecipientNote = resolvedRecipient
          ? ''
          : `\n\nNo recipient email was found. Check the task description for an email address or ask the user to provide one.`;
        return `Here is the email drafted by Quill — take this exact content and send it to ${resolvedRecipient || '[missing recipient]'}. The recipient email is ${resolvedRecipient || '[missing recipient]'}. Pass ${resolvedRecipient || '[missing recipient]'} as the to field in your scheduler tool call. Do not modify the email content.\n\nQUILL DRAFT:\n${quillOutput.output}${missingRecipientNote}`;
      }
      const missingRecipientNote = resolvedRecipient
        ? ''
        : `\n\nNo recipient email was found. Check the task description for an email address or ask the user to provide one.`;
      return `Quill draft was not found in context. Use the latest available agent output and send it to ${resolvedRecipient || '[missing recipient]'}. The recipient email is ${resolvedRecipient || '[missing recipient]'}. Pass ${resolvedRecipient || '[missing recipient]'} as the to field in your scheduler tool call.\n\nCurrent context:\n${prevContext}${missingRecipientNote}`;
    }

    const contextBlock = fullChainContext || `--- PREVIOUS AGENT OUTPUT (${last?.agentName || 'Previous Agent'}) ---\n${prevContext}\n---`;

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

  const stopPipeline = () => {
    stopRequestedRef.current = true;
    dispatch(setIsRunning(false));
    dispatch(setActiveAgent(null));
    toast('Stopping pipeline after the current step.', { icon: '🛑' });
  };

  // speak is an optional callback injected from useVoiceAgent to avoid circular imports.
  // Defaults to a no-op so the runner works fine without voice.
  const executePipeline = async ({ speak = null, startFromIndex = 0 } = {}) => {
    const sayAloud = typeof speak === 'function' ? speak : () => { };
    const sayFromRunner = async (text) => {
      if (isVoiceMuted) return;
      const message = String(text || '').trim();
      if (!message) return;
      try {
        await browserSpeak(message);
      } catch {
        // Best-effort announcement only.
      }
    };
    const firstWords = (text, count = 15) => String(text || '').trim().split(/\s+/).filter(Boolean).slice(0, count).join(' ');

    // Guard clause
    if (taskGoal.trim() === '' || pipeline.length === 0 || isRunning === true) {
      return;
    }

    dispatch(setLastFailedAtStep(null));
    dispatch(setLastVoiceResult(''));

    const shouldAutoOptimise = userPreferences?.autoOptimisePrompts !== false;
    const emailRegex = /[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/;
    const isValidEmail = (value) => emailRegex.test(String(value || '').trim());
    const inputRecipient = String(recipientEmail || '').trim();
    const fromTaskMatch = String(taskGoal || '').match(emailRegex);
    const defaultNotificationEmail = String(notificationSettings?.emailAddress || '').trim();
    const notificationsEmailEnabled = Boolean(notificationSettings?.emailEnabled);

    const resolvedRecipient = isValidEmail(inputRecipient)
      ? inputRecipient
      : (fromTaskMatch && isValidEmail(fromTaskMatch[0]))
        ? fromTaskMatch[0]
        : defaultNotificationEmail
          ? defaultNotificationEmail
          : '';

    console.log('RESOLVED RECIPIENT', resolvedRecipient, 'notifications.emailEnabled=', notificationsEmailEnabled);

    // Initial setup
    stopRequestedRef.current = false;
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

    const updateLogEntry = (id, updates) => {
      dispatch(updateLog({ id, ...updates }));
      const idx = currentLogs.findIndex((l) => l.id === id);
      if (idx !== -1) {
        currentLogs[idx] = { ...currentLogs[idx], ...updates };
      }
    };

    let currentSessionId = activeSessionId;
    const pipelineAgentsForReframer = pipeline
      .map((id) => agents.find((a) => a.id === id))
      .filter(Boolean)
      .map((a) => ({ name: a.name, tools: a.tools || [], role: a.role }));

    let optimisedTask = taskGoal;
    let reframePreview = null;
    if (shouldAutoOptimise) {
      try {
        const reframed = await api.reframePrompt({
          task: taskGoal,
          pipeline: pipelineAgentsForReframer,
          attachments: {
            hasPdf: Boolean(toolAttachments?.attachedPDF),
          },
        });
        if (reframed?.success && String(reframed?.reframed || '').trim()) {
          optimisedTask = String(reframed.reframed).trim();
          reframePreview = {
            original: taskGoal,
            reframed: optimisedTask,
            changes: Array.isArray(reframed?.changes) ? reframed.changes.slice(0, 4) : [],
          };
        }
      } catch {
        optimisedTask = taskGoal;
      }
    }

    // Preprocess PDF once before any agent instruction is built.
    let pdfContent = null;
    let pdfWordCount = 0;
    let pdfPageCount = 0;
    if (toolAttachments?.attachedPDF) {
      try {
        const rawPdf = String(toolAttachments.attachedPDF || '').trim();
        const normalizedPdfBase64 = rawPdf.includes(',') ? rawPdf.split(',').pop() : rawPdf;
        const pdfRes = await api.parsePdf({ base64: normalizedPdfBase64 });
        const content = String(pdfRes?.content || '').trim();
        if (pdfRes?.success && content) {
          pdfContent = content;
          pdfWordCount = Number(pdfRes?.wordCount || content.split(/\s+/).filter(Boolean).length || 0);
          pdfPageCount = Number(pdfRes?.pageCount || 0);
        } else {
          toast('Could not read PDF — running without file content.', { icon: '⚠️' });
        }
      } catch {
        toast('Could not read PDF — running without file content.', { icon: '⚠️' });
      }
    }

    // DISABLED — re-enable when ready to implement
    // let imageContent = null;
    // let imageVisionAvailable = null;
    // let imageVisionModel = null;
    // const noVisionUserFacingMessage = "No vision model is available to analyze the attached image. Run 'ollama pull llava' to enable image analysis and try again.";
    // const requiresImageUnderstanding = Boolean(toolAttachments?.attachedImage) && hasAnyKeyword(taskGoal, [
    //   'image', 'photo', 'picture', 'screenshot', 'logo', 'visual',
    //   'what is written', "what's written", 'read the text',
    //   'text in the image', 'what is the image about',
    // ]);
    // console.log(`ATTACHED IMAGE EXISTS: ${Boolean(toolAttachments?.attachedImage)}`);
    let reframeLogId = null;
    if (reframePreview) {
      const firstAgent = agents.find((a) => a.id === pipeline[0]);
      reframeLogId = pushLog({
        type: 'reframe',
        agentName: 'Prompt Optimiser',
        agentColor: firstAgent?.color || '#22d3ee',
        original: reframePreview.original,
        reframed: reframePreview.reframed,
        changes: reframePreview.changes,
        pdfMeta: pdfContent ? { wordCount: pdfWordCount, pageCount: pdfPageCount } : null,
        // DISABLED — re-enable when ready to implement
        // imageMeta: toolAttachments?.attachedImage
        //   ? { status: 'processing', model: 'CPU RAM' }
        //   : null,
        content: 'Prompt optimised for pipeline execution',
      });
    }

    // DISABLED — re-enable when ready to implement
    // if (toolAttachments?.attachedImage) {
    //   try {
    //     const attachment = toolAttachments?.attachedImage;
    //     const attachmentType = Object.prototype.toString.call(attachment);
    //     const attachmentPreview = typeof attachment === 'string' ? attachment.slice(0, 30) : '[non-string attachment]';
    //     console.log(`ATTACHED IMAGE TYPE: ${attachmentType} | PREVIEW: ${attachmentPreview}`);
    //     const normalizedImageBase64 = await resolveImageAttachmentToBase64(attachment);
    //     const imageRes = await api.analyzeImage({
    //       base64: normalizedImageBase64,
    //       imageName: toolAttachments?.attachedImageMeta?.filename || toolAttachments?.attachedImageName || 'Unknown image',
    //       width: Number(toolAttachments?.attachedImageMeta?.width || 0),
    //       height: Number(toolAttachments?.attachedImageMeta?.height || 0),
    //       filesizeKb: Number(toolAttachments?.attachedImageMeta?.filesizeKb || 0),
    //     });
    //     console.log('IMAGE ANALYZER RESPONSE:', imageRes);
    //     const description = String(imageRes?.description || '').trim();
    //     imageVisionAvailable = imageRes?.visionAvailable === false
    //       ? false
    //       : (imageRes?.visionAvailable === true ? true : null);
    //     imageVisionModel = String(imageRes?.model || '').trim() || null;
    //     if (imageRes?.success && description) {
    //       if (imageRes?.visionAvailable === false) {
    //         imageContent = "The user has attached an image file but no vision model is available to analyze it. Tell the user to run 'ollama pull llava' to enable image analysis. Do not describe or invent any image content.";
    //       } else {
    //         imageContent = description;
    //       }
    //       if (reframeLogId) {
    //         updateLogEntry(reframeLogId, { imageMeta: { status: 'done', model: imageVisionModel || 'CPU RAM' } });
    //       }
    //     } else {
    //       toast('Could not analyze image.', { icon: '⚠️' });
    //       if (reframeLogId) {
    //         updateLogEntry(reframeLogId, { imageMeta: { status: 'done', model: imageVisionModel || 'CPU RAM' } });
    //       }
    //     }
    //   } catch {
    //     toast('Could not analyze image.', { icon: '⚠️' });
    //     if (reframeLogId) {
    //       updateLogEntry(reframeLogId, { imageMeta: { status: 'done', model: imageVisionModel || 'CPU RAM' } });
    //     }
    //   }
    // }
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

    const initPfx = selectedLanguage !== 'en' ? await api.translate('Pipeline initiated — ', selectedLanguage) : 'Pipeline initiated — ';
    const initSfx = selectedLanguage !== 'en' ? await api.translate(` agents — Goal: ${taskGoal.substring(0, 80)}...`, selectedLanguage) : ` agents — Goal: ${taskGoal.substring(0, 80)}...`;

    pushLog({
      type: 'system',
      content: `${initPfx}${pipeline.length}${initSfx}`,
    });

    if (reframeLogId && toolAttachments?.attachedImage && imageVisionAvailable !== null) {
      updateLogEntry(reframeLogId, {
        imageMeta: { status: 'done', model: imageVisionModel || 'CPU RAM' },
      });
    }

    // Narrate pipeline start
    sayAloud(`Pipeline initiated. I'll narrate each step as your ${pipeline.length} agent${pipeline.length > 1 ? 's' : ''} work through the task.`);

    // Initialize context
    const contextHistory = [];
    let fullFinalOutput = "TASK: " + optimisedTask;
    const agentColors = [];
    let allFailed = true;
    let hermesRan = false;

    // Start a for loop over pipeline
    for (let i = 0; i < pipeline.length; i++) {
      // Skip already-completed steps when retrying
      if (i < startFromIndex) continue;

      if (stopRequestedRef.current) {
        pushLog({
          type: 'system',
          content: 'Pipeline stopped by voice command.',
        });
        break;
      }

      // Find agent
      const agent = agents.find(a => a.id === pipeline[i]);
      if (!agent) continue;

      if (agent.name === 'Hermes' || (agent.tools || []).includes('scheduler')) {
        hermesRan = true;
      }

      // Build role-specific instruction for this agent based on its tools and previous outputs
      const agentInstruction = generateAgentInstruction(agent, optimisedTask, i, pipeline.length, contextHistory, resolvedRecipient);

      // Build full context string: agent instruction + recent history for LLM
      let agentContext = agentInstruction;

      if (pdfContent) {
        agentContext += `\n\n--- ATTACHED DOCUMENT CONTENT ---\n${pdfContent}\n--- END OF DOCUMENT ---\n\nYour task: ${taskGoal}\nBase your entire response on the document content above. Do not use any outside knowledge. If the document does not contain enough information to complete the task, say so explicitly.`;
      }

      // DISABLED — re-enable when ready to implement
      // if (imageContent) {
      //   agentContext += `\n\n--- ATTACHED IMAGE ANALYSIS ---\n${imageContent}\n--- END OF IMAGE ANALYSIS ---\n\nYour task: ${taskGoal}\nBase your response entirely on the image analysis above. Do not describe any image other than what is described above.`;
      // }

      // if (String(agent.name || '').toLowerCase() === 'lens') {
      //   console.log(`USER MESSAGE SENT TO LENS: ${String(agentContext || '').slice(0, 300)}`);
      // }

      // Full prior chain is embedded by generateAgentInstruction for downstream agents.

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

      // DISABLED — re-enable when ready to implement
      // if (requiresImageUnderstanding && imageVisionAvailable === false) {
      //   const directOutput = noVisionUserFacingMessage;
      //   pushLog({ type: 'output', agentName: agent.name, agentColor: agent.color, content: directOutput });
      //   contextHistory.push({ agentName: String(agent.name || ''), role: String(agent.role || ''), output: directOutput });
      //   fullFinalOutput += `\n\n━━ ${agent.name.toUpperCase()} — ${agent.role} ━━\n${directOutput}`;
      //   allFailed = false;
      //   continue;
      // }


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
              try {
                const data = await api.searchWeb(optimisedTask);
                if (data && data.results && data.results.length > 0) {
                  toolResultContent = data.results
                    .map((r) => `• ${r.title}: ${r.snippet}\nURL: ${r.url || 'N/A'}`)
                    .join('\n\n');
                }
              } catch (searchError) {
                const status = searchError?.response?.status || '';
                const isQuota = status === 429 || String(searchError?.message || '').includes('429');
                const errMsg = isQuota
                  ? 'Web search quota exceeded — using knowledge from training data only.'
                  : `Web search unavailable (${status || 'network error'}) — using knowledge from training data only.`;
                console.warn('WEB SEARCH FAILED:', searchError.message);
                pushLog({
                  type: 'error',
                  agentName: agent.name,
                  agentColor: agent.color,
                  content: `⚠️ ${errMsg}`,
                });
                // Inject fallback notice into context so agent doesn't hallucinate fake sources
                agentContext += `\n\nTOOL RESULT from Web Search:\n[Web search failed — ${errMsg} Do NOT invent URLs or cite sources you have not been given. Answer from your own training knowledge and clearly state you are doing so.]`;
              }
            } else if (toolId === 'calculator') {
              const res = await api.calculate(optimisedTask);
              if (res) toolResultContent = res;
            } else if (toolId === 'summarizer') {
              const res = await api.summarize(agentContext);
              if (res) toolResultContent = res;
            } else if (toolId === 'email_draft') {
              const res = await api.draftEmail("Automated Draft", optimisedTask);
              if (res) toolResultContent = res;
            } else if (toolId === 'todo') {
              const res = await api.extractTodos(optimisedTask);
              if (res) {
                toolResultContent = res;

                if (googleCalendarConnected) {
                  const todoItems = parseTodoLines(res);
                  if (todoItems.length > 0) {
                    try {
                      await api.createCalendarEvents(todoItems);
                      pushLog({
                        type: 'system',
                        content: `📅 Calendar events created for ${todoItems.length} tasks — added to your Google Calendar.`,
                      });
                    } catch (calendarError) {
                      pushLog({
                        type: 'error',
                        content: `Google Calendar sync failed: ${calendarError.message || 'Unknown error'}`,
                      });
                    }
                  }
                }
              }
            } else if (toolId === 'scheduler') {
              const quillOutput = [...contextHistory].reverse().find((o) =>
                String(o?.agentName || '').toLowerCase() === 'quill' ||
                String(o?.role || '').toLowerCase().includes('email')
              );
              const lastNonHermes = [...contextHistory].reverse().find(o => o.agentName !== 'Hermes');

              const schedulerPayload = {
                taskDescription: optimisedTask,
                recipientEmail: resolvedRecipient,
                cronExpression: '0 9 * * *', // Default
                agentId: agent.id,
                emailContent: quillOutput?.output || '',
                previousAgentOutput: lastNonHermes?.output || ''
              };

              const res = await apiClient.post('/api/tools/scheduler', schedulerPayload);
              if (res.data) toolResultContent = res.data.message || 'Schedule created';
            } else if (toolId === 'pdf_reader') {
              const shouldRun = hasAnyKeyword(optimisedTask, ['pdf', '.pdf', 'document', 'extract from file']) || Boolean(toolAttachments?.attachedPDF);
              if (shouldRun && toolAttachments?.attachedPDF) {
                const rawPdf = String(toolAttachments.attachedPDF || '').trim();
                const normalizedPdfBase64 = rawPdf.includes(',') ? rawPdf.split(',').pop() : rawPdf;
                const res = await api.parsePdf({ base64: normalizedPdfBase64 });
                toolResultContent = JSON.stringify(res, null, 2);
              }
            // DISABLED — re-enable when ready to implement
            // } else if (toolId === 'image_analyzer') {
            //   const shouldRun = hasAnyKeyword(optimisedTask, ['image', 'photo', 'screenshot', 'picture', 'visual', 'diagram']) || Boolean(toolAttachments?.attachedImage);
            //   if (shouldRun && toolAttachments?.attachedImage) {
            //     const normalizedImageBase64 = await resolveImageAttachmentToBase64(toolAttachments?.attachedImage);
            //     const res = await api.analyzeImage({
            //       base64: normalizedImageBase64,
            //       imageName: toolAttachments?.attachedImageMeta?.filename || toolAttachments?.attachedImageName || 'Unknown image',
            //       width: Number(toolAttachments?.attachedImageMeta?.width || 0),
            //       height: Number(toolAttachments?.attachedImageMeta?.height || 0),
            //       filesizeKb: Number(toolAttachments?.attachedImageMeta?.filesizeKb || 0),
            //     });
            //     toolResultContent = JSON.stringify(res, null, 2);
            //   }
            // DISABLED — re-enable when ready to implement
            // } else if (toolId === 'code_runner') {
            //   const shouldRun = hasAnyKeyword(optimisedTask, ['run this code', 'execute', 'test this script', 'output of', 'compile']) || Boolean(toolAttachments?.attachedCode);
            //   if (shouldRun) {
            //     const code = toolAttachments?.attachedCode || optimisedTask;
            //     const language = toolAttachments?.codeLanguage || 'javascript';
            //     const res = await api.runCode({ code, language });
            //     toolResultContent = JSON.stringify(res, null, 2);
            //   }
            // DISABLED — re-enable when ready to implement
            // } else if (toolId === 'db_query') {
            //   const shouldRun = hasAnyKeyword(optimisedTask, ['query this data', 'from this dataset', 'in this table', 'filter', 'rows where']) || Boolean(toolAttachments?.attachedData);
            //   if (shouldRun) {
            //     const data = parseMaybeJsonData(toolAttachments?.attachedData) || extractDataArrayFromTask(optimisedTask) || [];
            //     const res = await api.queryDataset({ query: optimisedTask, data });
            //     toolResultContent = JSON.stringify(res, null, 2);
            //   }
            } else if (toolId === 'currency_converter') {
              const shouldRun = hasAnyKeyword(optimisedTask, ['convert currency', 'exchange rate', 'usd to', 'eur to', 'inr to', 'gbp to', 'how much in']) || Boolean(toolAttachments?.currencyRequest);
              if (shouldRun) {
                const req = toolAttachments?.currencyRequest || extractCurrencyRequestFromTask(optimisedTask);
                if (req && Number.isFinite(Number(req.amount)) && req.from && req.to) {
                  const res = await api.convertCurrency(req);
                  toolResultContent = JSON.stringify(res, null, 2);
                }
              }
            // DISABLED — re-enable when ready to implement
            // } else if (toolId === 'chart_generator') {
            //   const shouldRun = hasAnyKeyword(optimisedTask, ['create a chart', 'generate a graph', 'visualize', 'bar chart', 'pie chart', 'line graph', 'plot']) || Boolean(toolAttachments?.chartRequest);
            //   if (shouldRun) {
            //     const data = parseMaybeJsonData(toolAttachments?.attachedData)
            //       || parseMaybeJsonData(toolAttachments?.chartRequest?.content)
            //       || extractDataArrayFromTask(toolAttachments?.chartRequest?.content)
            //       || extractDataArrayFromTask(optimisedTask)
            //       || [];
            //     const chartType = hasAnyKeyword(optimisedTask, ['pie chart']) ? 'pie'
            //       : hasAnyKeyword(optimisedTask, ['line graph', 'line chart']) ? 'line'
            //         : hasAnyKeyword(optimisedTask, ['doughnut']) ? 'doughnut'
            //           : 'bar';
            //     const xKey = data[0] ? Object.keys(data[0])[0] : 'x';
            //     const yKey = data[0] ? Object.keys(data[0])[1] : 'y';
            //     const res = await api.generateChart({ data, chartType, title: 'Generated Chart', xKey, yKey });
            //     toolResultContent = JSON.stringify(res, null, 2);
            //     if (res?.success && res?.renderHint === 'chartjs' && res?.chartConfig) {
            //       pushLog({ type: 'output', agentName: agent.name, agentColor: agent.color,
            //         content: JSON.stringify({ renderHint: 'chartjs', chartConfig: res.chartConfig }, null, 2) });
            //     }
            //   }
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

      // Keep larger context when document content is injected.
      const contextLimit = pdfContent ? 22000 : 4000;
      // DISABLED — re-enable when ready to implement: const contextLimit = (pdfContent || imageContent) ? 22000 : 4000;
      if (agentContext.length > contextLimit) {
        agentContext = agentContext.substring(0, contextLimit) + "\n...[Context truncated for brevity]";
      }

      // Real agent API call via Streaming
      try {
        const fullAgent = agents.find((a) => a.id === agent.id) || agent;
        let resolvedPersonality = String(fullAgent?.personality || '').trim();
        if (!resolvedPersonality) {
          const agentName = fullAgent?.name || agent?.name || 'Agent';
          console.warn('[useAgentRunner] Missing personality in stream payload for agent:', agentName);
          resolvedPersonality = AGENT_PERSONALITY_FALLBACKS[agentName] || `You are ${agentName}. Complete the assigned task using the provided context and tools.`;
        }

        const streamPayload = {
          agentId: fullAgent.id,
          taskGoal: optimisedTask,
          recipientEmail: resolvedRecipient,
          agentName: fullAgent.name,
          role: fullAgent.role,
          personality: resolvedPersonality,
          tools: fullAgent.tools,
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
          console.log('STREAM PAYLOAD personality length:', streamPayload.personality?.length, 'agent:', fullAgent.name);
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

        contextHistory.push({
          agentName: String(agent.name || ''),
          role: String(agent.role || ''),
          output: output,
        });
        fullFinalOutput += `\n\n━━ ${agent.name.toUpperCase()} — ${agent.role} ━━\n${output}`;

        // POST-OUTPUT CALENDAR SYNC: After Sage (or any agent with the todo tool) finishes
        // streaming, parse the ACTUAL generated plan for ☑ / numbered task lines and sync
        // to Google Calendar. This replaces the pre-generation extraction which only had
        // the raw task goal (not the plan) and produced empty/wrong calendar events.
        if (googleCalendarConnected && Array.isArray(agent.tools) && agent.tools.includes('todo')) {
          const planLines = parseTodoLines(output);
          if (planLines.length > 0) {
            try {
              await api.createCalendarEvents(planLines);
              pushLog({
                type: 'system',
                content: `📅 ${planLines.length} task${planLines.length > 1 ? 's' : ''} from ${agent.name}'s plan added to your Google Calendar.`,
              });
            } catch (calErr) {
              pushLog({
                type: 'error',
                content: `Google Calendar sync failed: ${calErr.message || 'Unknown error'}`,
              });
            }
          }
        }

        const toolsUsedNames = (agent.tools || []).map(tId => {
          const t = TOOLS.find(x => x.id === tId);
          return t ? t.name : tId;
        }).filter(Boolean);

        const memoryEntry = {
          goal: optimisedTask,
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
        dispatch(setLastFailedAtStep(i));
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
      await sayFromRunner(`Pipeline failed. ${firstWords(errFail)}.`);
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
      isPipelineComplete: true,
      languageNote: selectedLanguage !== 'en' ? selectedLanguage : null
    });

    dispatch(setPipelineResult({
      sessionId: currentSessionId || null,
      taskGoal,
      originalTask: taskGoal,
      optimisedTask,
      agentOutputs: contextHistory.map((entry) => ({
        agentName: entry.agentName,
        output: entry.output,
      })),
      completedAt: new Date().toISOString(),
    }));

    const lastAgentOutput = String(contextHistory[contextHistory.length - 1]?.output || '').trim();
    dispatch(setLastVoiceResult(lastAgentOutput));

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
    await sayFromRunner('Pipeline complete. Say read the results to hear the output.');

    const pipelineStartTime = Date.now();

    dispatch(setRightTab("log"));

    const taskPayload = {
      taskGoal,
      originalTask: taskGoal,
      optimisedTask,
      pipeline,
      completedAt: new Date().toISOString(),
      logs: currentLogs,
      finalOutput: fullFinalOutput,
      agentColors,
      logsJson: currentLogs,
      agentCount: pipeline.length,
      durationMs: Date.now() - pipelineStartTime,
    };

    // Auto-email detection / settings-driven email delivery
    if (!hermesRan && resolvedRecipient) {
      const finalAgentOutput = contextHistory[contextHistory.length - 1]?.output || '';

      const subjectMatch = finalAgentOutput.match(/Subject:\s*(.*)/i);
      const subject = subjectMatch ? subjectMatch[1].trim() : optimisedTask.substring(0, 50);

      const htmlBody = finalAgentOutput.split('\n').map(line => `<p>${line}</p>`).join('');

      try {
        const emailRes = await api.sendEmail({
          to: resolvedRecipient,
          subject: subject,
          body: htmlBody
        });

        if (emailRes?.permissionPending === true) {
          toast.success(`Permission request sent to ${emailRes.recipientEmail || resolvedRecipient} — waiting for their approval`);
          pushLog({
            type: 'system',
            agentName: 'System',
            agentColor: 'yellow',
            content: `Permission request sent to ${emailRes.recipientEmail || resolvedRecipient} and awaiting approval.`,
          });
        } else if (emailRes?.emailSent === true || emailRes?.sent === true) {
          pushLog({
            type: 'system',
            agentName: 'System',
            agentColor: 'green',
            content: `Email sent successfully to ${resolvedRecipient}`
          });
        }
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
        originalTask: taskGoal,
        optimisedTask,
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


  return { executePipeline, stopPipeline };
}
