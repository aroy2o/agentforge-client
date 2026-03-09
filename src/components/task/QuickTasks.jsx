import { useAppDispatch } from '../../store';
import { setTaskGoal } from '../../store/taskSlice';
import Translate from '../layout/Translate';

const QUICK_TASKS = [
    'Research AI trends in 2025 and write an executive summary report',
    'Analyze pros and cons of remote work and recommend a company policy',
    'Research sustainable energy for small businesses and draft a proposal email',
    'Plan a product launch with a detailed week-by-week timeline and task list',
];

export default function QuickTasks() {
    const dispatch = useAppDispatch();

    return (
        <div className="glass-card w-full mb-8 shrink-0">
            {/* Header */}
            <div className="h-[40px] flex items-center px-5 border-b border-[var(--border-subtle)]">
                <span className="section-label m-0">
                    <Translate>QUICK TASKS</Translate>
                </span>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-[16px]">
                {QUICK_TASKS.map((task, index) => (
                    <button
                        key={index}
                        onClick={() => dispatch(setTaskGoal(task))}
                        className="glass-button-secondary min-h-[40px] px-4 py-2 text-12 text-left rounded-lg leading-snug overflow-hidden whitespace-nowrap text-ellipsis border-transparent border-l-2 hover:border-l-accent-cyan hover:text-[var(--text-primary)] transition-all cursor-pointer truncate"
                    >
                        <Translate>{task}</Translate>
                    </button>
                ))}
            </div>
        </div>
    );
}
