import AppLayout from '../components/layout/AppLayout';
import PipelineCanvas from '../components/pipeline/PipelineCanvas';
import TaskInput from '../components/task/TaskInput';
import QuickTasks from '../components/task/QuickTasks';
import { useAgentRunner } from '../hooks/useAgentRunner';
import ActivityLog from '../components/logs/ActivityLog';
import MemoryPanel from '../components/memory/MemoryPanel';

export default function Dashboard() {
  const { executePipeline } = useAgentRunner();

  const rightPanelContent = (
    <div className="flex flex-col h-full gap-6 p-6">
      <div className="flex-1 min-h-0 flex flex-col">
        <ActivityLog />
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        <MemoryPanel />
      </div>
    </div>
  );

  return (
    <AppLayout rightPanel={rightPanelContent}>
      <div className="p-4 md:p-6 2xl:p-10 flex flex-col gap-4 md:gap-6 w-full max-w-5xl 2xl:max-w-7xl mx-auto">
        <PipelineCanvas />
        <TaskInput onExecute={executePipeline} />
        <QuickTasks />

        {/* Mobile/Tablet fallback for the side panels */}
        <div className="flex flex-col xl:hidden gap-4 md:gap-6 mt-2">
          <div className="h-[400px] flex flex-col">
            <ActivityLog />
          </div>
          <div className="h-[400px] flex flex-col">
            <MemoryPanel />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
