import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../store';

export default function ProtectedRoute({ children }) {
    const { isAuthenticated, isLoading } = useAppSelector(s => s.auth);

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#e8eeff] via-[#f0f4ff] to-[#e4f0ff] dark:from-[#05060f] dark:via-[#08090f] dark:to-[#0a0812]">
                <div className="text-2xl font-bold tracking-widest text-blue-700 dark:text-accent-cyan uppercase mb-6 animate-pulse-opacity">
                    ⬡ AgentForge
                </div>
                <div className="w-8 h-8 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/auth" replace />;
    }

    return children;
}
