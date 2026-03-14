import AppLayout from '../components/layout/AppLayout';
import MemoryPanel from '../components/memory/MemoryPanel';

export default function Memory() {
    return (
        <AppLayout>
            <div className="p-4 md:p-6 2xl:p-10 w-full max-w-7xl mx-auto">
                <div className="h-[calc(100vh-140px)] min-h-[640px] glass-card overflow-hidden">
                    <MemoryPanel />
                </div>
            </div>
        </AppLayout>
    );
}
