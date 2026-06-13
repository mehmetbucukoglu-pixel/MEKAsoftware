'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { WorkspaceDocument, workspaceApi } from '@/lib/workspaceApi';
import { BaseWidget, WidgetType } from './widgets/types';
import { NoteWidget } from './widgets/note-widget';
import { TaskWidget } from './widgets/task-widget';
import { TableWidget } from './widgets/table-widget';
import { PrescriptionWidget } from './widgets/prescription-widget';
import { FileWidget } from './widgets/file-widget';
import { LinkWidget } from './widgets/link-widget';
import { PatientWidget } from './widgets/patient-widget';
import { TitleWidget } from './widgets/title-widget';
import { v4 as uuidv4 } from 'uuid';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { debounce } from 'lodash';
import {
    ListTodo, Table as TableIcon, StickyNote, Loader2, Palette,
    Bold, Italic, Underline, Strikethrough, Highlighter,
    AlignLeft, AlignCenter, AlignRight, User, Pill, Paperclip, Link2,
    Trash2, Plus, X, Command, Type, GripHorizontal
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkspaceEditorProps {
    document?: WorkspaceDocument;
    onDelete?: (id: string) => void;
    isSidebarClosed?: boolean;
    mode?: 'workspace' | 'clinical';
    initialContent?: string;
    onSaveClinical?: (json: string) => void;
}

type CanvasBlockType = 'text' | 'widget';

interface Position { x: number; y: number; }
interface Size { w: number; h: number; }

interface CanvasBlock {
    id: string;
    type: CanvasBlockType;
    pos: Position;
    size: Size;
    html?: string;
    widget?: BaseWidget;
    bgColor?: string;
    connectedTo?: string[];
}

// ─── Floating Toolbar ─────────────────────────────────────────────────────────

const COLORS = ['#e6edf3', '#ff7b72', '#ffa657', '#e3b341', '#7ee787', '#79c0ff', '#d2a8ff', '#ff79c6'];
const HIGHLIGHTS = ['#3d1f00', '#1a2d00', '#00204c', '#2e0a3b', '#1a1a00', '#0d2d2d'];
const BLOCK_COLORS = [
    { label: 'Varsayılan', value: '' },
    { label: 'Mavi', value: 'rgba(56,139,253,0.08)' },
    { label: 'Mor', value: 'rgba(163,113,247,0.08)' },
    { label: 'Yeşil', value: 'rgba(63,185,80,0.08)' },
    { label: 'Turuncu', value: 'rgba(210,153,34,0.08)' },
    { label: 'Kırmızı', value: 'rgba(248,81,73,0.08)' },
    { label: 'Pembe', value: 'rgba(219,85,175,0.08)' },
    { label: 'Turkuaz', value: 'rgba(35,190,200,0.08)' },
];

const FloatingToolbar = memo(function FloatingToolbar() {
    const [visible, setVisible] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const [showColors, setShowColors] = useState(false);
    const [showHighlights, setShowHighlights] = useState(false);
    const rafRef = useRef<number>(0);

    useEffect(() => {
        const onSel = () => {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => {
                const sel = window.getSelection();
                if (!sel || sel.isCollapsed || !sel.toString().trim()) {
                    setVisible(false); return;
                }
                const rect = sel.getRangeAt(0).getBoundingClientRect();
                if (!rect.width) { setVisible(false); return; }
                setPos({ top: rect.top + window.scrollY - 48, left: rect.left + window.scrollX + rect.width / 2 });
                setVisible(true);
            });
        };
        document.addEventListener('selectionchange', onSel);
        return () => { document.removeEventListener('selectionchange', onSel); cancelAnimationFrame(rafRef.current); };
    }, []);

    const cmd = useCallback((c: string, v?: string) => document.execCommand(c, false, v), []);
    if (!visible) return null;

    return (
        <div onMouseDown={(e) => e.preventDefault()} style={{
            position: 'fixed', top: pos.top, left: pos.left, transform: 'translateX(-50%)',
            zIndex: 9999, display: 'flex', alignItems: 'center', gap: '2px',
            padding: '4px 8px', borderRadius: '12px',
            background: 'rgba(20,24,30,0.95)', border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)',
        }}>
            <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                <button onMouseDown={() => cmd('formatBlock', 'H1')} style={{ padding: '4px 6px', borderRadius: '8px', background: 'transparent', border: 'none', color: '#e6edf3', cursor: 'pointer', display: 'flex', fontWeight: 800, fontSize: '13px' }} title="Büyük Başlık (H1)">H1</button>
                <button onMouseDown={() => cmd('formatBlock', 'H2')} style={{ padding: '4px 6px', borderRadius: '8px', background: 'transparent', border: 'none', color: '#e6edf3', cursor: 'pointer', display: 'flex', fontWeight: 700, fontSize: '12px' }} title="Orta Başlık (H2)">H2</button>
                <button onMouseDown={() => cmd('formatBlock', 'P')} style={{ padding: '4px 6px', borderRadius: '8px', background: 'transparent', border: 'none', color: '#e6edf3', cursor: 'pointer', display: 'flex', fontWeight: 500, fontSize: '12px' }} title="Normal Yazı">P</button>
            </div>
            <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.15)', margin: '0 2px' }} />
            {[
                { icon: Bold, c: 'bold' }, { icon: Italic, c: 'italic' },
                { icon: Underline, c: 'underline' }, { icon: Strikethrough, c: 'strikeThrough' },
            ].map(({ icon: Icon, c }) => (
                <button key={c} onMouseDown={() => cmd(c)}
                    style={{ padding: '4px 6px', borderRadius: '8px', background: 'transparent', border: 'none', color: '#e6edf3', cursor: 'pointer', display: 'flex' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                    <Icon size={13} />
                </button>
            ))}
            <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.15)', margin: '0 2px' }} />
            <div style={{ position: 'relative' }}>
                <button onMouseDown={() => { setShowColors(!showColors); setShowHighlights(false); }}
                    style={{ padding: '4px 6px', borderRadius: '8px', background: showColors ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: '#e6edf3', cursor: 'pointer', display: 'flex' }}>
                    <Palette size={13} />
                </button>
                {showColors && (
                    <div style={{ position: 'absolute', top: '32px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(20,24,30,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px', width: '90px', zIndex: 10000 }}>
                        {COLORS.map(c => <button key={c} onMouseDown={() => { cmd('foreColor', c); setShowColors(false); }}
                            style={{ width: '18px', height: '18px', borderRadius: '4px', background: c, border: '2px solid transparent', cursor: 'pointer' }} />)}
                    </div>
                )}
            </div>
            <div style={{ position: 'relative' }}>
                <button onMouseDown={() => { setShowHighlights(!showHighlights); setShowColors(false); }}
                    style={{ padding: '4px 6px', borderRadius: '8px', background: showHighlights ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: '#e6edf3', cursor: 'pointer', display: 'flex' }}>
                    <Highlighter size={13} />
                </button>
                {showHighlights && (
                    <div style={{ position: 'absolute', top: '32px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(20,24,30,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px', width: '90px', zIndex: 10000 }}>
                        {HIGHLIGHTS.map(c => <button key={c} onMouseDown={() => { cmd('hiliteColor', c); setShowHighlights(false); }}
                            style={{ width: '18px', height: '18px', borderRadius: '4px', background: c, border: '2px solid rgba(255,255,255,0.2)', cursor: 'pointer' }} />)}
                    </div>
                )}
            </div>
            <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.15)', margin: '0 2px' }} />
            {[
                { icon: AlignLeft, c: 'justifyLeft' }, { icon: AlignCenter, c: 'justifyCenter' }, { icon: AlignRight, c: 'justifyRight' },
            ].map(({ icon: Icon, c }) => (
                <button key={c} onMouseDown={() => cmd(c)}
                    style={{ padding: '4px 6px', borderRadius: '8px', background: 'transparent', border: 'none', color: '#e6edf3', cursor: 'pointer', display: 'flex' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                    <Icon size={13} />
                </button>
            ))}
        </div>
    );
});

// ─── Block Color Picker ───────────────────────────────────────────────────────

const BlockColorPicker = memo(function BlockColorPicker({ currentColor, onChange }: { currentColor?: string; onChange: (c: string) => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        window.addEventListener('mousedown', h);
        return () => window.removeEventListener('mousedown', h);
    }, [open]);

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }} title="Blok rengi" style={{
                width: '20px', height: '20px', borderRadius: '6px',
                background: currentColor || 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s ease'
            }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = currentColor || 'rgba(255,255,255,0.04)'; }}
            >
                <Palette size={10} style={{ color: 'rgba(255,255,255,0.6)' }} />
            </button>
            {open && (
                <div style={{
                    position: 'absolute', top: '28px', right: 0, zIndex: 10000,
                    background: 'rgba(20,24,30,0.97)', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '12px', padding: '10px', width: '150px',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.6)', backdropFilter: 'blur(16px)',
                }}>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Blok Rengi</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {BLOCK_COLORS.map(c => (
                            <button key={c.value || 'default'} title={c.label}
                                onClick={(e) => { e.stopPropagation(); onChange(c.value); setOpen(false); }}
                                style={{ width: '24px', height: '24px', borderRadius: '50%', background: c.value || 'rgba(255,255,255,0.04)', border: (currentColor || '') === c.value ? '2px solid rgba(88,188,220,0.7)' : '2px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'transform 0.1s' }}
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
});

// ─── Canvas Block Item ────────────────────────────────────────────────────────

const CanvasBlockItem = memo(function CanvasBlockItem({
    block, onChange, onRemove, onConnectStart, onConnectEnd, canvasRef, onSlashCommand, onCloseSlashCommand,
}: {
    block: CanvasBlock;
    onChange: (id: string, patch: Partial<CanvasBlock>) => void;
    onRemove: (id: string) => void;
    onConnectStart: (id: string) => void;
    onConnectEnd: (id: string) => void;
    canvasRef: React.RefObject<HTMLDivElement | null>;
    onSlashCommand?: (rect: DOMRect, blockId: string) => void;
    onCloseSlashCommand?: () => void;
    teamspaceId?: string;
}) {
    const [dragging, setDragging] = useState(false);
    const [resizing, setResizing] = useState(false);
    const [resizingRight, setResizingRight] = useState(false);
    const [focused, setFocused] = useState(false);
    const [hovered, setHovered] = useState(false);
    const dragStart = useRef<{ mx: number; my: number; bx: number; by: number } | null>(null);
    const resizeStart = useRef<{ mx: number; my: number; bw: number; bh: number } | null>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const dragTimeout = useRef<NodeJS.Timeout | null>(null);

    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const blockRef = useRef(block);
    blockRef.current = block;

    // Sync HTML content
    useEffect(() => {
        if (contentRef.current && block.type === 'text') {
            if (contentRef.current.innerHTML !== (block.html ?? '')) {
                contentRef.current.innerHTML = block.html ?? '';
            }
        }
    }, [block.id]);

    // Drag-anywhere logic
    const onMouseDown = useCallback((e: React.MouseEvent) => {
        // Prevent dragging if clicking on interactive elements (inputs, buttons, textareas)
        if ((e.target as HTMLElement).closest('input, button, textarea, [contenteditable="true"]')) {
            return;
        }
        
        e.preventDefault(); e.stopPropagation();
        
        const b = blockRef.current;
        dragStart.current = { mx: e.clientX, my: e.clientY, bx: b.pos.x, by: b.pos.y };
        
        // Add a tiny delay before activating drag to allow for simple clicks
        dragTimeout.current = setTimeout(() => {
            setDragging(true);
        }, 100);

    }, []);

    const onMouseUp = useCallback(() => {
        if (dragTimeout.current) clearTimeout(dragTimeout.current);
        if (!dragging) setFocused(true); // If it was just a click without drag, focus it
    }, [dragging]);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!dragging || !dragStart.current) return;
            const dx = e.clientX - dragStart.current.mx;
            const dy = e.clientY - dragStart.current.my;
            onChangeRef.current(blockRef.current.id, { pos: { x: Math.max(0, dragStart.current.bx + dx), y: Math.max(0, dragStart.current.by + dy) } });
        };
        const onUp = () => {
            if (dragTimeout.current) clearTimeout(dragTimeout.current);
            setDragging(false);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [dragging]);

    // Resize
    const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        const b = blockRef.current;
        resizeStart.current = { mx: e.clientX, my: e.clientY, bw: b.size.w, bh: b.size.h };
        setResizing(true);
    }, []);

    useEffect(() => {
        if (!resizing) return;
        const onMove = (e: MouseEvent) => {
            if (!resizeStart.current) return;
            const dx = e.clientX - resizeStart.current.mx;
            const dy = e.clientY - resizeStart.current.my;
            onChangeRef.current(blockRef.current.id, {
                size: { w: Math.max(180, resizeStart.current.bw + dx), h: Math.max(60, resizeStart.current.bh + dy) },
            });
        };
        const onUp = () => setResizing(false);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [resizing]);

    // Right-only Resize
    const onResizeRightMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        const b = blockRef.current;
        resizeStart.current = { mx: e.clientX, my: e.clientY, bw: b.size.w, bh: b.size.h };
        setResizingRight(true);
    }, []);

    useEffect(() => {
        if (!resizingRight) return;
        const onMove = (e: MouseEvent) => {
            if (!resizeStart.current) return;
            const dx = e.clientX - resizeStart.current.mx;
            onChangeRef.current(blockRef.current.id, {
                size: { w: Math.max(180, resizeStart.current.bw + dx), h: resizeStart.current.bh },
            });
        };
        const onUp = () => setResizingRight(false);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [resizingRight]);

    const handleTextInput = useCallback(() => {
        if (!contentRef.current) return;
        onChangeRef.current(blockRef.current.id, { html: contentRef.current.innerHTML });
        
        const text = contentRef.current.textContent || '';
        if (text.endsWith('/')) {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                if (onSlashCommand) onSlashCommand(rect, blockRef.current.id);
            }
        } else {
            if (onCloseSlashCommand) onCloseSlashCommand();
        }
    }, [onSlashCommand, onCloseSlashCommand]);

    const handleWidgetChange = useCallback((_wid: string, newContent: any) => {
        const b = blockRef.current;
        if (b.widget) {
            onChangeRef.current(b.id, { widget: { ...b.widget, content: newContent } });
        }
    }, []);

    const glassBg = block.bgColor || 'rgba(255,255,255,0.02)';

    const renderContent = () => {
        if (block.type === 'text') {
            return (
                <div
                    ref={contentRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleTextInput}
                    data-placeholder="Bir şeyler yazın..."
                    style={{
                        outline: 'none', lineHeight: 1.6, fontSize: '0.9rem',
                        color: '#e6edf3', minHeight: '40px', wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                    }}
                    className="ws-canvas-text"
                />
            );
        }

        if (block.widget) {
            switch (block.widget.type) {
                case 'task': return <TaskWidget widget={block.widget} onChange={handleWidgetChange} />;
                case 'table': return <TableWidget widget={block.widget} onChange={handleWidgetChange} />;
                case 'prescription': return <PrescriptionWidget widget={block.widget} onChange={handleWidgetChange} />;
                case 'file': return <FileWidget widget={block.widget} onChange={handleWidgetChange} />;
                case 'link': return <LinkWidget widget={block.widget} onChange={handleWidgetChange} />;
                case 'patient': return <PatientWidget widget={block.widget} onChange={handleWidgetChange} />;
                case 'title': return <TitleWidget widget={block.widget} onChange={handleWidgetChange} />;
                default: return <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>Bilinmeyen widget</div>;
            }
        }
        return null;
    };

    return (
        <div
            id={`block-${block.id}`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            style={{
                position: 'absolute', left: block.pos.x, top: block.pos.y,
                width: block.size.w, minHeight: block.size.h,
                height: block.widget?.type === 'title' ? block.size.h : undefined,
                zIndex: focused || dragging ? 100 : 1,
                userSelect: dragging ? 'none' : 'text',
                cursor: dragging ? 'grabbing' : 'auto',
            }}
            onFocus={(e) => {
                if ((e.target as HTMLElement).closest('input, textarea, [contenteditable="true"]')) {
                    setFocused(true);
                }
            }}
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocused(false); }}
            tabIndex={-1}
        >
            <div style={{
                background: block.widget?.type === 'title' ? 'transparent' : glassBg,
                border: block.widget?.type === 'title' ? 'none' : `1px solid ${focused || dragging ? 'rgba(88,188,220,0.4)' : hovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: block.widget?.type === 'title' ? '0' : '20px', 
                padding: block.widget?.type === 'title' ? '0' : '16px',
                boxShadow: block.widget?.type === 'title' ? 'none' : (dragging 
                    ? '0 20px 40px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.05)'
                    : focused 
                        ? '0 8px 32px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.05)'
                        : '0 4px 16px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(255,255,255,0.02)'),
                backdropFilter: block.widget?.type === 'title' ? 'none' : 'blur(20px) saturate(1.2)',
                WebkitBackdropFilter: block.widget?.type === 'title' ? 'none' : 'blur(20px) saturate(1.2)',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.1s ease',
                transform: dragging ? 'scale(1.02)' : 'scale(1)',
                overflow: 'visible', position: 'relative', minHeight: block.size.h,
                height: block.widget?.type === 'title' ? block.size.h : undefined,
            }}>
                {/* Drag Handle */}
                <div style={{
                    position: 'absolute', top: '-14px', left: '16px',
                    display: focused || dragging ? 'flex' : 'none',
                    alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(20,24,30,0.95)', borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.1)', padding: '2px 8px', zIndex: 10,
                    cursor: 'grab', color: 'rgba(255,255,255,0.5)',
                    animation: 'fadeIn 0.2s ease-out', boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}
                onMouseDown={onMouseDown}
                >
                    <GripHorizontal size={14} />
                </div>

                {/* Top toolbar */}
                <div style={{
                    position: 'absolute', top: '-14px', right: '16px',
                    display: focused || dragging ? 'flex' : 'none',
                    alignItems: 'center', gap: '4px',
                    background: 'rgba(20,24,30,0.95)', borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.1)', padding: '4px', zIndex: 10,
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <BlockColorPicker currentColor={block.bgColor} onChange={(c) => onChange(block.id, { bgColor: c })} />
                    <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.1)' }} />
                    <button onClick={(e) => { e.stopPropagation(); onRemove(block.id); }} style={{
                        background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,80,80,0.7)',
                        display: 'flex', alignItems: 'center', padding: '2px 4px', borderRadius: '4px', transition: 'background 0.15s'
                    }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,80,80,0.1)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                    >
                        <Trash2 size={12} />
                    </button>
                </div>

                {/* Connection Nodes */}
                {(hovered || focused || dragging) && block.widget?.type !== 'title' && (
                    <>
                        <div className="connection-node top" onMouseDown={(e) => { e.stopPropagation(); onConnectStart(block.id); }} onMouseUp={() => onConnectEnd(block.id)} />
                        <div className="connection-node right" onMouseDown={(e) => { e.stopPropagation(); onConnectStart(block.id); }} onMouseUp={() => onConnectEnd(block.id)} />
                        <div className="connection-node bottom" onMouseDown={(e) => { e.stopPropagation(); onConnectStart(block.id); }} onMouseUp={() => onConnectEnd(block.id)} />
                        <div className="connection-node left" onMouseDown={(e) => { e.stopPropagation(); onConnectStart(block.id); }} onMouseUp={() => onConnectEnd(block.id)} />
                    </>
                )}

                {renderContent()}

                {/* Resize handle */}
                <div onMouseDown={onResizeMouseDown} style={{
                    position: 'absolute', right: '4px', bottom: '4px',
                    width: '20px', height: '20px', cursor: 'se-resize',
                    opacity: focused || dragging ? 0.6 : 0, transition: 'opacity 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20
                }}>
                    <svg width="12" height="12" viewBox="0 0 20 20">
                        <path d="M20 0L20 20L0 20Z" fill="currentColor" opacity="0.4" />
                    </svg>
                </div>

                {/* Right Resize handle */}
                <div onMouseDown={onResizeRightMouseDown} style={{
                    position: 'absolute', right: '-4px', top: '50%', transform: 'translateY(-50%)',
                    width: '12px', height: '24px', cursor: 'e-resize',
                    background: 'rgba(255,255,255,0.4)', borderRadius: '4px',
                    opacity: focused || dragging ? 1 : 0, transition: 'opacity 0.2s',
                    boxShadow: '0 0 4px rgba(0,0,0,0.5)', zIndex: 20
                }} />
            </div>
            
            <style>{`
                .connection-node {
                    position: absolute; width: 12px; height: 12px; background: var(--primary);
                    border: 2px solid #0d1117; border-radius: 50%; opacity: 0; transition: opacity 0.2s; cursor: crosshair;
                }
                #block-${block.id}:hover .connection-node { opacity: 0.8; }
                .connection-node:hover { opacity: 1 !important; transform: scale(1.2); }
                .connection-node.top { top: -6px; left: 50%; transform: translateX(-50%); }
                .connection-node.bottom { bottom: -6px; left: 50%; transform: translateX(-50%); }
                .connection-node.left { left: -6px; top: 50%; transform: translateY(-50%); }
                .connection-node.right { right: -6px; top: 50%; transform: translateY(-50%); }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
});

// ─── Context Menu ─────────────────────────────────────────────────────────────

function CanvasContextMenu({
    pos, onAdd, onClose, mode
}: {
    pos: { x: number; y: number };
    onAdd: (type: CanvasBlockType, widgetType?: WidgetType) => void;
    onClose: () => void;
    mode: 'workspace' | 'clinical';
}) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('mousedown', h);
        window.addEventListener('keydown', esc);
        return () => { window.removeEventListener('mousedown', h); window.removeEventListener('keydown', esc); };
    }, [onClose]);

    const items = [
        { type: 'widget' as CanvasBlockType, wType: 'title' as WidgetType, label: 'Sayfa Başlığı', desc: 'Büyük başlık', icon: Type, color: '#e6edf3' },
        { type: 'text' as CanvasBlockType, label: 'Metin', desc: 'Serbest yazım', icon: StickyNote, color: '#79c0ff' },
        { type: 'widget' as CanvasBlockType, wType: 'task' as WidgetType, label: 'Görev', desc: 'Tamamlanabilir liste', icon: ListTodo, color: '#ffa657' },
        { type: 'widget' as CanvasBlockType, wType: 'prescription' as WidgetType, label: 'Reçete', desc: 'İlaç dozu', icon: Pill, color: '#7ee787' },
        { type: 'widget' as CanvasBlockType, wType: 'file' as WidgetType, label: 'Dosya', desc: 'Görsel/Belge', icon: Paperclip, color: '#ff79c6' },
        { type: 'widget' as CanvasBlockType, wType: 'link' as WidgetType, label: 'Bağlantı', desc: 'Web URL', icon: Link2, color: '#d2a8ff' },
        ...(mode === 'workspace' ? [{ type: 'widget' as CanvasBlockType, wType: 'patient' as WidgetType, label: 'Hasta Kartı', desc: 'Hasta detayı', icon: User, color: '#58a6ff' }] : []),
    ];

    return (
        <div ref={ref} style={{
            position: 'fixed', top: pos.y, left: pos.x, zIndex: 9999,
            background: 'rgba(16,20,26,0.85)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px', padding: '10px', width: '220px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.4)', backdropFilter: 'blur(32px) saturate(1.5)',
        }}>
            <div style={{ padding: '4px 10px 8px', fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Blok Ekle
            </div>
            <div style={{ display: 'grid', gap: '2px' }}>
                {items.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                        <button key={idx}
                            onClick={() => { onAdd(item.type, item.wType); onClose(); }}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '8px 10px', borderRadius: '10px', cursor: 'pointer',
                                background: 'transparent', border: 'none', textAlign: 'left', transition: 'all 0.15s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Icon size={14} style={{ color: item.color }} />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#e6edf3' }}>{item.label}</div>
                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>{item.desc}</div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

export function WorkspaceEditor({ document: doc, onDelete, isSidebarClosed, mode = 'workspace', initialContent, onSaveClinical }: WorkspaceEditorProps) {
    const queryClient = useQueryClient();
    const [title, setTitle] = useState(doc?.title || '');
    const [blocks, setBlocks] = useState<CanvasBlock[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
    const [connectingStart, setConnectingStart] = useState<string | null>(null);
    const [mousePos, setMousePos] = useState<Position>({ x: 0, y: 0 });
    const [scale, setScale] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [slashMenu, setSlashMenu] = useState<{ x: number, y: number, blockId: string } | null>(null);
    
    const containerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                setScale(s => Math.min(Math.max(0.3, s - e.deltaY * 0.005), 2));
            } else {
                setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
            }
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, []);
    
    const titleRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const titleSyncRef = useRef(title);
    titleSyncRef.current = title;

    // Load content
    useEffect(() => {
        if (mode === 'workspace' && doc) {
            setTitle(doc.title);
            if (titleRef.current) titleRef.current.textContent = doc.title;
            try {
                const parsed = JSON.parse(doc.content || '[]');
                if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].pos) {
                    setBlocks(parsed);
                } else setBlocks([]);
            } catch { setBlocks([]); }
        } else if (mode === 'clinical') {
            try {
                const parsed = JSON.parse(initialContent || '[]');
                if (Array.isArray(parsed)) setBlocks(parsed);
                else setBlocks([]);
            } catch { setBlocks([]); }
        }
    }, [doc?.id, initialContent, mode]);

    const updateMutation = useMutation({
        mutationFn: async (data: { title?: string; content?: string }) => {
            if (doc) return workspaceApi.updateDocument(doc.id, data);
            return Promise.resolve();
        },
        onMutate: () => setIsSaving(true),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspace-documents'] }),
        onSettled: () => setIsSaving(false),
    });

    const debouncedSave = useCallback(
        debounce((b: CanvasBlock[]) => {
            if (mode === 'workspace' && doc) {
                const titleBlock = b.find(block => block.widget?.type === 'title');
                const docTitleHtml = titleBlock?.widget?.content?.text || 'Başlıksız';
                const docTitle = docTitleHtml.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim() || 'Başlıksız';
                updateMutation.mutate({ title: docTitle, content: JSON.stringify(b) });
            } else if (mode === 'clinical' && onSaveClinical) {
                setIsSaving(true);
                onSaveClinical(JSON.stringify(b));
                setTimeout(() => setIsSaving(false), 500);
            }
        }, 1000),
        [doc?.id, mode, onSaveClinical]
    );

    const changeBlock = useCallback((id: string, patch: Partial<CanvasBlock>) => {
        setBlocks(prev => {
            const next = prev.map(b => b.id === id ? { ...b, ...patch } : b);
            debouncedSave(next);
            return next;
        });
    }, [debouncedSave]);

    const removeBlock = useCallback((id: string) => {
        setBlocks(prev => {
            const next = prev.filter(b => b.id !== id);
            // Also remove connections to this block
            const cleanNext = next.map(b => ({
                ...b,
                connectedTo: b.connectedTo?.filter(c => c !== id)
            }));
            debouncedSave(cleanNext);
            return cleanNext;
        });
    }, [debouncedSave]);

    const addBlock = useCallback((type: CanvasBlockType, wType?: WidgetType, screenPos?: Position) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        const scrollTop = canvasRef.current?.scrollTop ?? 0;
        const scrollLeft = canvasRef.current?.scrollLeft ?? 0;
        
        let canvasX = 100;
        let canvasY = 100;

        if (screenPos && rect) {
            canvasX = screenPos.x - rect.left + scrollLeft;
            canvasY = screenPos.y - rect.top + scrollTop;
        }

        const sizeMap: Record<string, Size> = {
            text: { w: 280, h: 90 },
            task: { w: 300, h: 140 },
            table: { w: 400, h: 160 },
            prescription: { w: 320, h: 160 },
            file: { w: 280, h: 120 },
            link: { w: 260, h: 120 },
            patient: { w: 300, h: 120 },
            title: { w: 500, h: 100 }
        };

        const key = type === 'text' ? 'text' : wType || 'text';
        const size = sizeMap[key] || { w: 300, h: 100 };

        let widget: BaseWidget | undefined;
        if (type === 'widget' && wType) {
            widget = { id: uuidv4(), type: wType, content: {} };
            if (wType === 'table') widget.content = { headers: ['Sütun 1', 'Sütun 2'], rows: [['', '']] };
            if (wType === 'task') widget.content = { tasks: [] };
            if (wType === 'prescription') widget.content = { prescriptions: [] };
            if (wType === 'file') widget.content = { files: [] };
            if (wType === 'link') widget.content = { url: '' };
            if (wType === 'patient') widget.content = { patientId: '' };
            if (wType === 'title') widget.content = { text: '' };
        }

        const newBlock: CanvasBlock = {
            id: uuidv4(),
            type,
            pos: { x: Math.max(0, canvasX - size.w / 2), y: Math.max(0, canvasY - size.h / 2) },
            size,
            ...(type === 'text' ? { html: '' } : { widget }),
        };
        
        setBlocks(prev => {
            const next = [...prev, newBlock];
            debouncedSave(next);
            return next;
        });
    }, [debouncedSave]);

    const handleSlashCommand = useCallback((rect: DOMRect, blockId: string) => {
        setSlashMenu({ x: rect.left, y: rect.bottom + 10, blockId });
    }, []);
    
    const handleCloseSlashCommand = useCallback(() => {
        setSlashMenu(null);
    }, []);

    

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('input, textarea, button, [contenteditable="true"]')) return;
        e.preventDefault();
        setCtxMenu({ x: e.clientX, y: e.clientY });
    }, []);

    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        // Double click functionality removed as requested
    }, []);

    // Canvas connection drawing
    const handleConnectStart = useCallback((id: string) => {
        setConnectingStart(id);
    }, []);

    const handleConnectEnd = useCallback((id: string) => {
        if (connectingStart && connectingStart !== id) {
            setBlocks(prev => {
                const next = prev.map(b => {
                    if (b.id === connectingStart) {
                        const existing = b.connectedTo || [];
                        if (!existing.includes(id)) {
                            return { ...b, connectedTo: [...existing, id] };
                        }
                    }
                    return b;
                });
                debouncedSave(next);
                return next;
            });
        }
        setConnectingStart(null);
    }, [connectingStart, debouncedSave]);

    useEffect(() => {
        if (!connectingStart) return;
        const updateMouse = (e: MouseEvent) => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect) {
                setMousePos({ 
                    x: e.clientX - rect.left + (canvasRef.current?.scrollLeft || 0), 
                    y: e.clientY - rect.top + (canvasRef.current?.scrollTop || 0) 
                });
            }
        };
        const endConnect = () => setConnectingStart(null);
        window.addEventListener('mousemove', updateMouse);
        window.addEventListener('mouseup', endConnect);
        return () => { window.removeEventListener('mousemove', updateMouse); window.removeEventListener('mouseup', endConnect); };
    }, [connectingStart]);

    // Render SVG lines
    const renderConnections = () => {
        const lines: React.ReactNode[] = [];
        
        blocks.forEach(b1 => {
            if (b1.connectedTo && b1.connectedTo.length > 0) {
                b1.connectedTo.forEach(targetId => {
                    const b2 = blocks.find(b => b.id === targetId);
                    if (b2) {
                        // Draw from center to center
                        const x1 = b1.pos.x + b1.size.w / 2;
                        const y1 = b1.pos.y + b1.size.h / 2;
                        const x2 = b2.pos.x + b2.size.w / 2;
                        const y2 = b2.pos.y + b2.size.h / 2;
                        
                        lines.push(
                            <line key={`${b1.id}-${b2.id}`} x1={x1} y1={y1} x2={x2} y2={y2} 
                                stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeDasharray="5,5" />
                        );
                        // Arrow head
                        const angle = Math.atan2(y2 - y1, x2 - x1);
                        const radius = Math.min(b2.size.w, b2.size.h) / 2 + 10;
                        const ax = x2 - Math.cos(angle) * radius;
                        const ay = y2 - Math.sin(angle) * radius;
                        lines.push(
                            <circle key={`arr-${b1.id}-${b2.id}`} cx={ax} cy={ay} r="4" fill="var(--primary)" opacity="0.8" />
                        );
                    }
                });
            }
        });

        if (connectingStart) {
            const b1 = blocks.find(b => b.id === connectingStart);
            if (b1) {
                const x1 = b1.pos.x + b1.size.w / 2;
                const y1 = b1.pos.y + b1.size.h / 2;
                lines.push(
                    <line key="temp-line" x1={x1} y1={y1} x2={mousePos.x} y2={mousePos.y} 
                        stroke="var(--primary)" strokeWidth="2" strokeDasharray="5,5" opacity="0.6" />
                );
            }
        }

        return lines;
    };

    const canvasW = Math.max(1600, ...blocks.map(b => b.pos.x + b.size.w + 100));
    const canvasH = Math.max(1200, ...blocks.map(b => b.pos.y + b.size.h + 100));

    return (
        <>
            <FloatingToolbar />

            <div 
                ref={containerRef}
                className="flex-1 flex flex-col h-full overflow-hidden" 
                style={{ 
                    backgroundColor: '#0a0d14',
                    backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
                    `,
                    backgroundSize: `${40 * scale}px ${40 * scale}px`,
                    backgroundPosition: `${pan.x}px ${pan.y}px`
                }}
            >
                {/* Zoom Controls */}
                <div style={{ position: 'absolute', bottom: 20, right: 20, zIndex: 100, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(20,24,30,0.9)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                    <button onClick={() => { setScale(1); setPan({x:0, y:0}); }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', transition: 'all 0.2s' }} title="Varsayılana Dön" onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}>
                        <Command size={12} /> 
                    </button>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{(scale * 100).toFixed(0)}%</span>
                    <div style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.2)' }} />
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>Ctrl+Scroll: Zoom | Scroll: Kaydır</span>
                </div>

                {isSaving && (
                    <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 100, display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.5)', padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
                        <Loader2 size={12} className="spin" /> Kaydediliyor
                    </div>
                )}

                {/* Canvas Area */}
                <div
                    ref={canvasRef}
                    onContextMenu={handleContextMenu}
                    style={{ 
                        position: 'relative', 
                        flex: 1, 
                        minHeight: '600px', 
                        cursor: 'inherit',
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                        transformOrigin: '0 0',
                        willChange: 'transform',
                    }}
                >
                    {blocks.length === 0 && (
                        <div style={{
                            position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
                            textAlign: 'center', color: 'rgba(255,255,255,0.15)', pointerEvents: 'none',
                        }}>
                            <Command size={48} style={{ marginBottom: '16px', opacity: 0.3, margin: '0 auto' }} />
                            <div style={{ fontSize: '1.1rem', fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>Boş Alan</div>
                            <div style={{ fontSize: '0.85rem', marginTop: '8px', opacity: 0.6, maxWidth: '250px' }}>
                                Sağ tıkla, menüyü aç veya sürükleyip bırakarak yeni bloklar ekle.
                            </div>
                        </div>
                    )}

                    <div style={{ position: 'relative', width: canvasW, height: canvasH }}>
                        {/* SVG Layer for Connections */}
                        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
                            {renderConnections()}
                        </svg>

                        {/* Blocks Layer */}
                        {blocks.map(block => (
                            <CanvasBlockItem
                                key={block.id}
                                block={block}
                                onChange={changeBlock}
                                onRemove={removeBlock}
                                onConnectStart={handleConnectStart}
                                onConnectEnd={handleConnectEnd}
                                canvasRef={canvasRef}
                                onSlashCommand={handleSlashCommand}
                                onCloseSlashCommand={handleCloseSlashCommand}
                                teamspaceId={doc?.teamspaceId}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {slashMenu && (
                <CanvasContextMenu 
                    pos={{ x: slashMenu.x, y: slashMenu.y }} 
                    onAdd={(t, wt) => {
                        // Remove the slash from text
                        const block = blocks.find(b => b.id === slashMenu.blockId);
                        if (block && block.type === 'text') {
                            const newHtml = block.html?.replace(/\/$/, '') || '';
                            changeBlock(slashMenu.blockId, { html: newHtml });
                        }
                        
                        // Add new block nearby
                        const b = blocks.find(b => b.id === slashMenu.blockId);
                        if (b) {
                            // Find position below
                            addBlock(t, wt, { x: slashMenu.x, y: slashMenu.y + 100 });
                        }
                        setSlashMenu(null);
                    }} 
                    onClose={() => setSlashMenu(null)} 
                    mode={mode} 
                />
            )}

            {ctxMenu && (
                <CanvasContextMenu pos={ctxMenu} onAdd={addBlock} onClose={() => setCtxMenu(null)} mode={mode} />
            )}

            <style>{`
                .ws-canvas-text:empty:before { content: attr(data-placeholder); color: rgba(230,237,243,0.2); pointer-events: none; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </>
    );
}
