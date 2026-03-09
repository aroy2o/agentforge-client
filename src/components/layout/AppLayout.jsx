import { useState, useCallback, useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import AgentModal from '../agents/AgentModal';
import VoiceControlPanel from './VoiceControlPanel';

export default function AppLayout({ children, rightPanel }) {
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
    const [rightPanelWidth, setRightPanelWidth] = useState(480);
    const [isDragging, setIsDragging] = useState(false);

    // Handle mouse move for resizing
    const handleMouseMove = useCallback((e) => {
        if (!isDragging) return;

        // Calculate the new width based on window width - mouse X position
        // This works because the panel is snapped to the right side
        const newWidth = window.innerWidth - e.clientX;

        // Constrain between 320px (min) and 800px (max)
        if (newWidth >= 320 && newWidth <= 800) {
            setRightPanelWidth(newWidth);
        }
    }, [isDragging]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Attach global listeners while dragging
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            // Add a cursor style to the body to prevent cursor flickering
            document.body.style.cursor = 'col-resize';
        } else {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    return (
        <div className="flex flex-col h-screen w-full bg-transparent text-[var(--text-primary)]">
            {/* Header Area */}
            <div className="h-[64px] shrink-0">
                <Header onMenuClick={() => setIsMobileSidebarOpen(true)} />
            </div>

            {/* Main Layout Area */}
            <div className="flex flex-row flex-1 overflow-hidden relative">
                {/* Mobile Backdrop */}
                {isMobileSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
                        onClick={() => setIsMobileSidebarOpen(false)}
                    />
                )}

                {/* Left Sidebar */}
                <div
                    className={`fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 ${isDesktopSidebarOpen ? 'w-80 2xl:w-96' : 'w-16 2xl:w-20'} shrink-0 overflow-y-auto glass-sidebar scrollbar-thin ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
                >
                    <Sidebar
                        onClose={() => setIsMobileSidebarOpen(false)}
                        isCollapsed={!isDesktopSidebarOpen}
                        onToggleCollapse={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
                    />
                </div>

                {/* Center Column */}
                <main className="flex-1 overflow-y-auto scrollbar-thin bg-transparent pb-[100px]">
                    {children}
                </main>

                {/* Right Panel Wrapper (with Drag Handle) */}
                {rightPanel && (
                    <div
                        className="hidden xl:flex shrink-0 relative"
                        style={{ width: `${rightPanelWidth}px` }}
                    >
                        {/* Drag Handle Overlay */}
                        <div
                            className={`absolute left-0 top-0 bottom-0 w-[4px] -ml-[2px] z-50 cursor-col-resize transition-colors hover:bg-accent-cyan ${isDragging ? 'bg-accent-cyan' : 'bg-transparent'}`}
                            onMouseDown={() => setIsDragging(true)}
                        />

                        {/* Panel Content (Takes remaining space of the dynamic wrapper) */}
                        <div className="flex-1 overflow-y-auto w-full h-full glass-sidebar scrollbar-thin border-l border-[var(--border-subtle)]">
                            {rightPanel}
                        </div>
                    </div>
                )}
            </div>

            {/* Global Modals */}
            <AgentModal />

            {/* Floating Voice Control Panel */}
            <VoiceControlPanel />
        </div>
    );
}
