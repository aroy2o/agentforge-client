import { useEffect, useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import PipelineCanvas from '../components/pipeline/PipelineCanvas';
import TaskInput from '../components/task/TaskInput';
import QuickTasks from '../components/task/QuickTasks';
import { useAgentRunner } from '../hooks/useAgentRunner';
import ActivityLog from '../components/logs/ActivityLog';
import { useAppSelector } from '../store';
import { registerVoicePageHandlers } from '../utils/voicePageHandlers';
import OnboardingOverlay, { shouldShowOnboarding } from '../components/layout/OnboardingOverlay';

export default function Dashboard() {
  const { executePipeline, stopPipeline } = useAgentRunner();
  const agents = useAppSelector((state) => state.agents.agents);
  const [showOnboarding, setShowOnboarding] = useState(shouldShowOnboarding);


  useEffect(() => {
    const unregister = registerVoicePageHandlers({
      runPipeline: () => executePipeline(),
      stopPipeline: () => stopPipeline(),
    }, () => ({
      agentRoster: agents.map((a) => a.name).filter(Boolean),
    }));
    return unregister;
  }, [agents, executePipeline, stopPipeline]);

  const rightPanelContent = (
    <div className="flex flex-col h-full p-6">
      <div className="flex-1 min-h-0 flex flex-col">
        <ActivityLog />
      </div>
    </div>
  );

  return (
    <AppLayout rightPanel={rightPanelContent}>
      {showOnboarding && <OnboardingOverlay onDismiss={() => setShowOnboarding(false)} />}
      <div className="p-4 md:p-6 2xl:p-10 flex flex-col gap-4 md:gap-6 w-full max-w-5xl 2xl:max-w-7xl mx-auto">
        <PipelineCanvas />
        <TaskInput onExecute={executePipeline} />
        <QuickTasks />

        {/* Mobile/Tablet fallback for the side panels */}
        <div className="flex flex-col xl:hidden gap-4 md:gap-6 mt-2">
          <div className="h-[70vh] min-h-[420px] flex flex-col">
            <ActivityLog />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
