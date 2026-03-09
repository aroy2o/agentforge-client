export default function PipelineArrow({ isActive }) {
    return (
        <div className="flex items-center shrink-0 mx-2">
            <svg
                width="24"
                height="16"
                viewBox="0 0 24 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-all duration-300 ${isActive
                        ? 'text-accent-cyan drop-shadow-[0_0_8px_rgba(0,212,255,0.8)] animate-pulse'
                        : 'text-[var(--border-default)]'
                    }`}
            >
                <path d="M4 8h16M14 2l6 6-6 6" />
            </svg>
        </div>
    );
}
