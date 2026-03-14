'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DetailDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}

export function DetailDrawer({
    isOpen,
    onClose,
    title,
    children,
    footer,
}: DetailDrawerProps) {
    // Close on Escape
    React.useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <>
            {/* Backdrop */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100] transition-opacity duration-300 ease-in-out",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={cn(
                    "fixed inset-y-0 right-0 w-full max-w-[480px] z-[101] transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) glass-panel shadow-premium flex flex-col",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                {/* Header */}
                <div className="h-20 flex items-center justify-between px-8 border-b border-white/5 bg-white/5 backdrop-blur-md">
                    <h2 className="text-lg font-bold tracking-tight text-white/90">
                        {title || 'Detaylar'}
                    </h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="rounded-full hover:bg-white/10 text-white/40 hover:text-white/90 transition-all"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Content */}
                <ScrollArea className="flex-1">
                    <div className="p-8">
                        {children}
                    </div>
                </ScrollArea>

                {/* Footer */}
                {footer && (
                    <div className="p-8 border-t border-white/5 bg-white/5 backdrop-blur-md">
                        {footer}
                    </div>
                )}
            </div>
        </>
    );
}
