'use client';

import * as React from 'react';
import { WorkspaceDocument } from '@/lib/workspaceApi';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, FileText, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface SortableNavItemProps {
    document: WorkspaceDocument;
    isActive: boolean;
    onSelect: (id: string) => void;
    onSettingsClick?: (id: string) => void;
}

export function SortableNavItem({ document, isActive, onSelect, onSettingsClick }: SortableNavItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: document.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group relative flex items-center justify-between py-1 px-2 rounded-md cursor-pointer text-[#37352F] dark:text-[#FFFFFFCF] transition-colors mb-0.5",
                isActive
                    ? "bg-black/5 dark:bg-white/10 font-medium"
                    : "bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-[14px]",
                isDragging && "opacity-50 z-50 bg-background shadow-md border-border"
            )}
            onClick={() => onSelect(document.id)}
        >
            <div className="flex items-center gap-2 overflow-hidden flex-1">
                {/* Drag Grip Handle */}
                <button
                    {...attributes}
                    {...listeners}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground/40 hover:bg-black/10 dark:hover:bg-white/10 hover:text-foreground cursor-grab active:cursor-grabbing shrink-0 transition-opacity absolute -left-4"
                    onClick={(e) => e.stopPropagation()}
                >
                    <GripVertical className="h-3.5 w-3.5" />
                </button>

                {/* Icon */}
                <div className="flex items-center justify-center shrink-0 w-4 h-4 opacity-80">
                    {document.icon ? (
                        <span className="text-[14px] leading-none">{document.icon}</span>
                    ) : (
                        <FileText className="h-4 w-4" />
                    )}
                </div>

                {/* Title */}
                <div className="flex flex-col overflow-hidden max-w-full">
                    <span className="text-[14px] truncate leading-tight">
                        {document.title || 'Untitled'}
                    </span>
                </div>
            </div>

            {/* Settings button, only shows on hover for non-active, or always for active if desired (Notion style: show on hover) */}
            {onSettingsClick && (
                <button
                    onClick={(e) => { e.stopPropagation(); onSettingsClick(document.id) }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground shrink-0 transition-all ml-1"
                    title="Options"
                >
                    <Settings className="h-3.5 w-3.5" />
                </button>
            )}
        </div>
    );
}
