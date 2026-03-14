import { useState } from 'react';
import { X, ArrowRight, Cpu, Target, Play } from 'lucide-react';

const STORAGE_KEY = 'agentforge_onboarded';

const STEPS = [
    {
        icon: Cpu,
        title: 'Build Your Pipeline',
        description: 'Click any agent card in the roster to add them to your pipeline. Chain multiple agents to tackle complex tasks.',
        color: '#00d4ff',
    },
    {
        icon: Target,
        title: 'Describe Your Goal',
        description: 'Type what you want to accomplish in the task input below. Be specific — more detail gives better results.',
        color: '#a78bfa',
    },
    {
        icon: Play,
        title: 'Run & Review',
        description: 'Hit Run to launch the pipeline. Watch the activity log as agents work step by step, then review results in Mission Archive.',
        color: '#34d399',
    },
];

export function shouldShowOnboarding() {
    try {
        return !localStorage.getItem(STORAGE_KEY);
    } catch {
        return false;
    }
}

export default function OnboardingOverlay({ onDismiss }) {
    const [step, setStep] = useState(0);

    const dismiss = () => {
        try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
        onDismiss?.();
    };

    const current = STEPS[step];
    const Icon = current.icon;
    const isLast = step === STEPS.length - 1;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="relative w-full max-w-sm glass-card rounded-2xl p-7 shadow-2xl border border-[var(--border-subtle)]">
                {/* Close */}
                <button
                    onClick={dismiss}
                    className="absolute top-4 right-4 p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)] transition-colors"
                    aria-label="Skip onboarding"
                >
                    <X size={14} />
                </button>

                {/* Step dots */}
                <div className="flex gap-1.5 mb-6">
                    {STEPS.map((_, i) => (
                        <span
                            key={i}
                            className="h-1 rounded-full transition-all duration-300"
                            style={{
                                width: i === step ? '20px' : '6px',
                                backgroundColor: i <= step ? current.color : 'var(--border-subtle)',
                            }}
                        />
                    ))}
                </div>

                {/* Icon */}
                <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                    style={{ backgroundColor: current.color + '22', border: `1px solid ${current.color}44` }}
                >
                    <Icon size={22} style={{ color: current.color }} />
                </div>

                {/* Content */}
                <h2 className="text-base font-bold text-[var(--text-primary)] mb-2">
                    {current.title}
                </h2>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-7">
                    {current.description}
                </p>

                {/* Actions */}
                <div className="flex justify-between items-center">
                    <button
                        onClick={dismiss}
                        className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        Skip
                    </button>
                    <button
                        onClick={() => isLast ? dismiss() : setStep((s) => s + 1)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-95"
                        style={{ backgroundColor: current.color, color: '#000' }}
                    >
                        {isLast ? 'Get Started' : 'Next'}
                        {!isLast && <ArrowRight size={14} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
