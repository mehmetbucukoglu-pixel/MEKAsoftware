'use client';

import * as React from 'react';
import { BaseWidget, LinkContent } from './types';
import { Link2, ExternalLink } from 'lucide-react';

interface LinkWidgetProps {
    widget: BaseWidget;
    onChange: (id: string, newContent: any) => void;
    isReadOnly?: boolean;
}

export function LinkWidget({ widget, onChange, isReadOnly }: LinkWidgetProps) {
    const content = (widget.content as LinkContent) || { url: '' };

    return (
        <div style={{ width: '100%' }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                marginBottom: '10px', paddingBottom: '8px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
                <div style={{
                    width: '24px', height: '24px', borderRadius: '8px',
                    background: 'rgba(210,168,255,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Link2 size={13} style={{ color: '#d2a8ff' }} />
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.02em' }}>
                    Bağlantı
                </span>
            </div>

            {/* URL input */}
            <input
                value={content.url || ''}
                onChange={(e) => onChange(widget.id, { ...content, url: e.target.value })}
                placeholder="https://..."
                readOnly={isReadOnly}
                style={{
                    width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px', padding: '8px 10px', color: '#79c0ff',
                    fontSize: '0.8rem', outline: 'none', transition: 'border-color 0.15s',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(121,192,255,0.3)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
            />

            {/* Title input */}
            <input
                value={content.title || ''}
                onChange={(e) => onChange(widget.id, { ...content, title: e.target.value })}
                placeholder="Başlık (opsiyonel)"
                readOnly={isReadOnly}
                style={{
                    width: '100%', background: 'transparent', border: 'none',
                    padding: '6px 2px 0', color: 'rgba(255,255,255,0.5)',
                    fontSize: '0.75rem', outline: 'none',
                }}
            />

            {/* Preview link */}
            {content.url && (
                <a href={content.url} target="_blank" rel="noreferrer"
                    style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        marginTop: '8px', fontSize: '0.75rem', color: '#79c0ff',
                        textDecoration: 'none', opacity: 0.7,
                        transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; }}
                >
                    <ExternalLink size={11} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {content.title || content.url}
                    </span>
                </a>
            )}
        </div>
    );
}
