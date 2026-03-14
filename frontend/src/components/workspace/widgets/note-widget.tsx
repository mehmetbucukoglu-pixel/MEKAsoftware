'use client';

import * as React from 'react';
import { BaseWidget, NoteContent } from './types';
import { Textarea } from '@/components/ui/textarea';

interface NoteWidgetProps {
    widget: BaseWidget;
    onChange: (id: string, newContent: any) => void;
    isReadOnly?: boolean;
}

export function NoteWidget({ widget, onChange, isReadOnly }: NoteWidgetProps) {
    const content = (widget.content as NoteContent) || { text: '' };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(widget.id, { text: e.target.value });
        // Auto-resize
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
    };

    return (
        <div className="w-full">
            <textarea
                className="w-full bg-transparent border-none outline-none resize-none focus:ring-0 text-foreground/90 font-medium placeholder:text-muted-foreground/30 min-h-[40px] overflow-hidden"
                placeholder="Bir şeyler yazın veya ' / ' ile komut verin..."
                value={content.text || ''}
                onChange={handleChange}
                readOnly={isReadOnly}
                rows={1}
                style={{ height: 'auto' }}
                ref={(el) => {
                    if (el) {
                        el.style.height = 'auto';
                        el.style.height = el.scrollHeight + 'px';
                    }
                }}
            />
        </div>
    );
}
