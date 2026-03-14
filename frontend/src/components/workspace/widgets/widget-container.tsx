'use client';

import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BaseWidget } from './types';
import { NoteWidget } from './note-widget';
import { TaskWidget } from './task-widget';
import { TableWidget } from './table-widget';

interface WidgetContainerProps {
    widget: BaseWidget;
    onChange: (id: string, newContent: any) => void;
    onRemove: (id: string) => void;
    isReadOnly?: boolean;
}

export function WidgetContainer({ widget, onChange, onRemove, isReadOnly }: WidgetContainerProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: widget.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const renderWidget = () => {
        switch (widget.type) {
            case 'note':
                return <NoteWidget widget={widget} onChange={onChange} isReadOnly={isReadOnly} />;
            case 'task':
                return <TaskWidget widget={widget} onChange={onChange} isReadOnly={isReadOnly} />;
            case 'table':
                return <TableWidget widget={widget} onChange={onChange} isReadOnly={isReadOnly} />;
            default:
                return <div className="text-destructive text-sm p-4 border border-destructive/20 rounded">Bilinmeyen Widget Tipi</div>;
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group relative flex gap-2 w-full py-1",
                isDragging && "opacity-50 z-50",
                // Focus-within applies styles when any element inside the widget is focused
                "focus-within:bg-accent/5 rounded-xl transition-colors p-2 -mx-2"
            )}
        >
            {!isReadOnly && (
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-1 absolute -left-10 shrink-0">
                    <button
                        {...attributes}
                        {...listeners}
                        className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground cursor-grab active:cursor-grabbing"
                        title="Sürüklemek için tutun"
                    >
                        <GripVertical className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Adding right delete action instead of left to prevent clutter */}
            <div className="flex-1 min-w-0 pr-8 relative">
                {renderWidget()}

                {!isReadOnly && (
                    <button
                        onClick={() => onRemove(widget.id)}
                        className="absolute right-0 top-1 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Widget'ı Sil"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                )}
            </div>
        </div>
    );
}
