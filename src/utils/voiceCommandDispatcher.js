import { addToPipeline, clearPipeline, removeFromPipeline } from '../store/pipelineSlice';
import { setTaskGoal } from '../store/taskSlice';
import { setTheme } from '../store/themeSlice';
import { setMuted } from '../store/voiceSlice';
import { setIsEditing, setSelectedAgent } from '../store/agentsSlice';

function normalizeTranscript(transcript) {
  return String(transcript || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isRepeatRequest(transcript) {
  const normalized = normalizeTranscript(transcript);
  return [
    'repeat that',
    'say that again',
    'what did you say',
    'come again',
  ].some((phrase) => normalized.includes(phrase));
}

function extractCommandTail(normalized, prefixes) {
  for (const prefix of prefixes) {
    if (normalized.startsWith(prefix)) {
      return normalized.slice(prefix.length).trim();
    }
  }
  return '';
}

function findAgentByName(agents, normalizedTranscript) {
  return (agents || []).find((agent) => normalizedTranscript.includes(String(agent.name || '').toLowerCase()));
}

async function speakIfPossible(context, message) {
  if (message) {
    await context.speak?.(message);
  }
}

async function handleUnmatched(transcript, context) {
  const pageHandlers = context.pageHandlers || {};
  if (typeof pageHandlers.onUnmatched === 'function') {
    await pageHandlers.onUnmatched(transcript);
    return true;
  }
  if (typeof context.onUnmatched === 'function') {
    await context.onUnmatched(transcript);
    return true;
  }
  return false;
}

export async function dispatchVoiceCommand(transcript, context) {
  const normalized = normalizeTranscript(transcript);
  const pageHandlers = context.pageHandlers || {};
  const agents = context.agents || [];
  const dispatch = context.dispatch;
  const navigate = context.navigate;

  if (!normalized) return false;

  if (normalized.includes('help') || normalized.includes('what can i say')) {
    await speakIfPossible(context, 'Try commands like go to dashboard, add Forge to pipeline, add Scout to pipeline, set task to build a React feature, run pipeline, create schedule, open chat, or dark mode.');
    return true;
  }

  if (normalized.includes('go to dashboard') || normalized.includes('open dashboard') || normalized === 'dashboard') {
    navigate?.('/dashboard');
    await speakIfPossible(context, 'Opening dashboard.');
    return true;
  }

  if (normalized.includes('go to agents') || normalized.includes('open agents') || normalized.includes('open agent builder')) {
    navigate?.('/agents');
    await speakIfPossible(context, 'Opening agents.');
    return true;
  }

  if (normalized.includes('go to chat') || normalized.includes('open chat')) {
    navigate?.('/chat');
    await speakIfPossible(context, 'Opening chat.');
    return true;
  }

  if (normalized.includes('go to scheduler') || normalized.includes('open scheduler')) {
    navigate?.('/scheduler');
    await speakIfPossible(context, 'Opening scheduler.');
    return true;
  }

  if (normalized.includes('go to settings') || normalized.includes('open settings')) {
    navigate?.('/settings');
    await speakIfPossible(context, 'Opening settings.');
    return true;
  }

  if (normalized.includes('go to results') || normalized.includes('open results')) {
    navigate?.('/results');
    await speakIfPossible(context, 'Opening results.');
    return true;
  }

  if (normalized.includes('dark mode')) {
    dispatch?.(setTheme('dark'));
    await speakIfPossible(context, 'Dark mode enabled.');
    return true;
  }

  if (normalized.includes('light mode')) {
    dispatch?.(setTheme('light'));
    await speakIfPossible(context, 'Light mode enabled.');
    return true;
  }

  if (normalized.includes('mute voice') || normalized === 'mute') {
    context.stopSpeaking?.();
    dispatch?.(setMuted(true));
    return true;
  }

  if (normalized.includes('unmute voice') || normalized === 'unmute') {
    dispatch?.(setMuted(false));
    await speakIfPossible(context, 'Voice unmuted.');
    return true;
  }

  if (normalized.includes('clear pipeline')) {
    dispatch?.(clearPipeline());
    await speakIfPossible(context, 'Pipeline cleared.');
    return true;
  }

  if (normalized.includes('run pipeline') || normalized.includes('start pipeline')) {
    if (typeof pageHandlers.runPipeline === 'function') {
      await pageHandlers.runPipeline();
      return true;
    }
    await speakIfPossible(context, 'Run pipeline is only available on the dashboard.');
    return true;
  }

  if (normalized.includes('stop pipeline')) {
    if (typeof pageHandlers.stopPipeline === 'function') {
      await pageHandlers.stopPipeline();
      return true;
    }
    await speakIfPossible(context, 'Stop pipeline is only available on the dashboard.');
    return true;
  }

  if (normalized.includes('add') && normalized.includes('to pipeline')) {
    const agent = findAgentByName(agents, normalized);
    if (agent) {
      dispatch?.(addToPipeline(agent.id || agent._id));
      await speakIfPossible(context, `${agent.name} added to the pipeline.`);
      return true;
    }
  }

  if ((normalized.includes('remove') || normalized.includes('delete')) && normalized.includes('from pipeline')) {
    const agent = findAgentByName(agents, normalized);
    if (agent) {
      dispatch?.(removeFromPipeline(agent.id || agent._id));
      await speakIfPossible(context, `${agent.name} removed from the pipeline.`);
      return true;
    }
  }

  if (normalized.startsWith('set task to ') || normalized.startsWith('task ') || normalized.startsWith('set goal to ')) {
    const taskText = extractCommandTail(normalized, ['set task to ', 'task ', 'set goal to ']);
    if (taskText) {
      dispatch?.(setTaskGoal(taskText));
      await speakIfPossible(context, 'Task updated.');
      return true;
    }
  }

  if (normalized.includes('create schedule')) {
    navigate?.('/scheduler');
    await pageHandlers.createSchedule?.();
    await speakIfPossible(context, 'Opening scheduler.');
    return true;
  }

  if (normalized.startsWith('run schedule ') && normalized.endsWith(' now')) {
    const scheduleName = normalized.replace(/^run schedule /, '').replace(/ now$/, '').trim();
    if (scheduleName && typeof pageHandlers.runScheduleNow === 'function') {
      await pageHandlers.runScheduleNow(scheduleName);
      return true;
    }
  }

  if (normalized.startsWith('delete schedule ')) {
    const scheduleName = normalized.replace(/^delete schedule /, '').trim();
    if (scheduleName && typeof pageHandlers.deleteSchedule === 'function') {
      await pageHandlers.deleteSchedule(scheduleName);
      return true;
    }
  }

  if (normalized.includes('create new chat') || normalized === 'new chat') {
    navigate?.('/chat');
    if (typeof pageHandlers.newChat === 'function') {
      await pageHandlers.newChat();
    }
    await speakIfPossible(context, 'Starting a new chat.');
    return true;
  }

  if (normalized.startsWith('send message ')) {
    const message = extractCommandTail(normalized, ['send message ']);
    if (message && typeof pageHandlers.sendMessage === 'function') {
      await pageHandlers.sendMessage(message);
      return true;
    }
  }

  if (normalized.includes('create agent')) {
    navigate?.('/agents');
    await speakIfPossible(context, 'Opening the agent builder.');
    return true;
  }

  if (normalized.startsWith('edit agent ')) {
    const name = normalized.replace(/^edit agent /, '').trim();
    const agent = (agents || []).find((item) => String(item.name || '').toLowerCase() === name);
    if (agent) {
      navigate?.('/agents');
      dispatch?.(setSelectedAgent(agent));
      dispatch?.(setIsEditing(true));
      await speakIfPossible(context, `Opening ${agent.name} for editing.`);
      return true;
    }
  }

  const matchedUnseenInput = await handleUnmatched(transcript, context);
  if (matchedUnseenInput) {
    return true;
  }

  await speakIfPossible(context, 'I did not recognize that command. Say help to hear available commands.');
  return false;
}
