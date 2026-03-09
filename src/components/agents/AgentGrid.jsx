import { useAppSelector } from '../../store';
import AgentCard from './AgentCard';

export default function AgentGrid({ isCollapsed }) {
    const agents = useAppSelector((state) => state.agents.agents);
    const pipeline = useAppSelector((state) => state.pipeline.pipeline);
    const activeAgentId = useAppSelector((state) => state.task.activeAgentId);

    return (
        <div className="flex flex-col gap-3">
            {agents.map((agent) => (
                <AgentCard
                    key={agent.id}
                    agent={agent}
                    isActive={activeAgentId === agent.id}
                    inPipeline={pipeline.includes(agent.id)}
                    isCollapsed={isCollapsed}
                />
            ))}
        </div>
    );
}
