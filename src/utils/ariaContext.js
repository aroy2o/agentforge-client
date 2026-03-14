function getPageName(pathname = '') {
  if (pathname === '/' || pathname.startsWith('/dashboard')) return 'Dashboard';
  if (pathname.startsWith('/scheduler')) return 'Scheduler';
  if (pathname.startsWith('/chat')) return 'Chat';
  if (pathname.startsWith('/settings')) return 'Settings';
  if (pathname.startsWith('/agents') || pathname.startsWith('/builder')) return 'Agents';
  if (pathname.startsWith('/results')) return 'Results';
  return 'Unknown';
}

export function buildAriaContext(state, location, extras = {}) {
  const pipelineIds = state?.pipeline?.pipeline || [];
  const allAgents = state?.agents?.agents || [];
  const selectedAgents = pipelineIds
    .map((id) => allAgents.find((agent) => (agent.id || agent._id) === id))
    .filter(Boolean)
    .map((agent) => agent.name)
    .filter(Boolean);

  const userNameRaw = String(state?.auth?.user?.name || '').trim();
  const userName = userNameRaw ? userNameRaw.split(' ')[0] : 'there';

  const currentTask = String(state?.task?.taskGoal || '').trim();
  const schedules = extras.schedules || [];
  const toolAttachments = state?.task?.toolAttachments || {};
  const lastOutput = String(state?.task?.pipelineResult || '').trim();

  return {
    currentPage: getPageName(location?.pathname || ''),
    pipeline: selectedAgents,
    currentTask,
    userName,
    schedulesCount: Array.isArray(schedules) ? schedules.length : Number(extras.schedulesCount || 0),
    hasAttachment: Boolean(toolAttachments.attachedPDF || toolAttachments.attachedImage || toolAttachments.attachedCode || toolAttachments.attachedData),
    lastPipelineResult: lastOutput ? lastOutput.slice(0, 100) : '',
    ...extras,
  };
}
