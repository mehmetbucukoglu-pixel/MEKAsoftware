'use client';

import * as React from 'react';
import { useRef, useEffect } from 'react';
import { BaseWidget } from './types';

interface TitleWidgetProps {
    widget: BaseWidget;
    onChange: (id: string, newContent: any) => void;
}

export function TitleWidget({ widget, onChange }: TitleWidgetProps) {
    const content = widget.content || { text: '' };
    const contentRef = useRef<HTMLDivElement>(null);

    // Sync HTML content
    useEffect(() => {
        if (contentRef.current && contentRef.current.innerHTML !== content.text) {
            contentRef.current.innerHTML = content.text;
        }
    }, [content.text, widget.id]);

    const handleInput = () => {
        if (contentRef.current) {
            onChange(widget.id, { text: contentRef.current.innerHTML });
        }
    };

    return (
        <div style={{ width: '100%', height: '100%', padding: '4px', containerType: 'size' }}>
            <div
                ref={contentRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                data-placeholder="Sayfa Başlığı"
                style={{
                    outline: 'none',
                    fontSize: 'clamp(24px, 60cqmin, 200px)',
                    fontWeight: 700,
                    color: '#e6edf3',
                    minHeight: '100%',
                    height: '100%',
                    wordBreak: 'break-word',
                    lineHeight: 1.3,
                    background: 'transparent',
                    border: 'none',
                    width: '100%',
                }}
                className="ws-title-widget"
            />
            <style>{`
                .ws-title-widget:empty:before { 
                    content: attr(data-placeholder); 
                    color: rgba(230,237,243,0.15); 
                    pointer-events: none; 
                }
            `}</style>
        </div>
    );
}
