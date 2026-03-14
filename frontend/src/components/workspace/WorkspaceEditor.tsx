'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { WorkspaceDocument, workspaceApi } from '@/lib/workspaceApi';
import { BaseWidget, WidgetType } from './widgets/types';
import { NoteWidget } from './widgets/note-widget';
import { TaskWidget } from './widgets/task-widget';
import { TableWidget } from './widgets/table-widget';
import { v4 as uuidv4 } from 'uuid';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { debounce } from 'lodash';
import {
    ListTodo, Table as TableIcon, StickyNote, Loader2, Palette,
    Bold, Italic, Underline, Strikethrough, Highlighter,
    AlignLeft, AlignCenter, AlignRight,
    Trash2, GripHorizontal, Plus, X,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkspaceEditorProps {
    document: WorkspaceDocument;
    onDelete: (id: string) => void;
    isSidebarClosed?: boolean;
}

type CanvasBlockType = 'text' | 'task' | 'table';

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
}

// ─── Block Colors ─────────────────────────────────────────────────────────────

const BLOCK_COLORS = [
    { label: 'Varsayılan', value: '' },
    { label: 'Mavi', value: 'rgba(56,139,253,0.12)' },
    { label: 'Mor', value: 'rgba(163,113,247,0.12)' },
    { label: 'Yeşil', value: 'rgba(63,185,80,0.12)' },
    { label: 'Turuncu', value: 'rgba(210,153,34,0.12)' },
    { label: 'Kırmızı', value: 'rgba(248,81,73,0.12)' },
    { label: 'Pembe', value: 'rgba(219,85,175,0.12)' },
    { label: 'Turkuaz', value: 'rgba(35,190,200,0.12)' },
];

// ─── Floating Toolbar ─────────────────────────────────────────────────────────

const COLORS = ['#e6edf3', '#ff7b72', '#ffa657', '#e3b341', '#7ee787', '#79c0ff', '#d2a8ff', '#ff79c6'];
const HIGHLIGHTS = ['#3d1f00', '#1a2d00', '#00204c', '#2e0a3b', '#1a1a00', '#0d2d2d'];

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
            padding: '4px 8px', borderRadius: '10px',
            background: 'rgba(20,24,30,0.95)', border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)',
        }}>
            {[
                { icon: Bold, c: 'bold' }, { icon: Italic, c: 'italic' },
                { icon: Underline, c: 'underline' }, { icon: Strikethrough, c: 'strikeThrough' },
            ].map(({ icon: Icon, c }) => (
                <button key={c} onMouseDown={() => cmd(c)}
                    style={{ padding: '4px 6px', borderRadius: '6px', background: 'transparent', border: 'none', color: '#e6edf3', cursor: 'pointer', display: 'flex' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                    <Icon size={13} />
                </button>
            ))}
            <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.15)', margin: '0 2px' }} />
            <div style={{ position: 'relative' }}>
                <button onMouseDown={() => { setShowColors(!showColors); setShowHighlights(false); }}
                    style={{ padding: '4px 6px', borderRadius: '6px', background: showColors ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: '#e6edf3', cursor: 'pointer', display: 'flex' }}>
                    <Palette size={13} />
                </button>
                {showColors && (
                    <div style={{ position: 'absolute', top: '32px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(20,24,30,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px', width: '90px', zIndex: 10000 }}>
                        {COLORS.map(c => <button key={c} onMouseDown={() => { cmd('foreColor', c); setShowColors(false); }}
                            style={{ width: '18px', height: '18px', borderRadius: '4px', background: c, border: '2px solid transparent', cursor: 'pointer' }} />)}
                    </div>
                )}
            </div>
            <div style={{ position: 'relative' }}>
                <button onMouseDown={() => { setShowHighlights(!showHighlights); setShowColors(false); }}
                    style={{ padding: '4px 6px', borderRadius: '6px', background: showHighlights ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: '#e6edf3', cursor: 'pointer', display: 'flex' }}>
                    <Highlighter size={13} />
                </button>
                {showHighlights && (
                    <div style={{ position: 'absolute', top: '32px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(20,24,30,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px', width: '90px', zIndex: 10000 }}>
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
                    style={{ padding: '4px 6px', borderRadius: '6px', background: 'transparent', border: 'none', color: '#e6edf3', cursor: 'pointer', display: 'flex' }}
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
                width: '18px', height: '18px', borderRadius: '6px',
                background: currentColor || 'rgba(255,255,255,0.06)',
                border: '2px solid rgba(255,255,255,0.2)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <Palette size={9} style={{ color: 'rgba(255,255,255,0.5)' }} />
            </button>
            {open && (
                <div style={{
                    position: 'absolute', top: '24px', right: 0, zIndex: 10000,
                    background: 'rgba(20,24,30,0.97)', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '10px', padding: '8px', width: '140px',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.6)', backdropFilter: 'blur(16px)',
                }}>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Blok Rengi</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {BLOCK_COLORS.map(c => (
                            <button key={c.value || 'default'} title={c.label}
                                onClick={(e) => { e.stopPropagation(); onChange(c.value); setOpen(false); }}
                                style={{ width: '22px', height: '22px', borderRadius: '6px', background: c.value || 'rgba(255,255,255,0.04)', border: (currentColor || '') === c.value ? '2px solid rgba(88,188,220,0.7)' : '2px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
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
    block, onChange, onRemove, canvasRef,
}: {
    block: CanvasBlock;
    onChange: (id: string, patch: Partial<CanvasBlock>) => void;
    onRemove: (id: string) => void;
    canvasRef: React.RefObject<HTMLDivElement | null>;
}) {
    const [dragging, setDragging] = useState(false);
    const [resizing, setResizing] = useState(false);
    const [focused, setFocused] = useState(false);
    const dragStart = useRef<{ mx: number; my: number; bx: number; by: number } | null>(null);
    const resizeStart = useRef<{ mx: number; my: number; bw: number; bh: number } | null>(null);
    const contentRef = useRef<HTMLDivElement>(null);

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
    }, [block.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Drag
    const onDragMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        const b = blockRef.current;
        dragStart.current = { mx: e.clientX, my: e.clientY, bx: b.pos.x, by: b.pos.y };
        setDragging(true);
    }, []);

    useEffect(() => {
        if (!dragging) return;
        const onMove = (e: MouseEvent) => {
            if (!dragStart.current) return;
            const dx = e.clientX - dragStart.current.mx;
            const dy = e.clientY - dragStart.current.my;
            onChangeRef.current(blockRef.current.id, { pos: { x: Math.max(0, dragStart.current.bx + dx), y: Math.max(0, dragStart.current.by + dy) } });
        };
        const onUp = () => setDragging(false);
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

    const handleTextInput = useCallback(() => {
        if (contentRef.current) onChangeRef.current(blockRef.current.id, { html: contentRef.current.innerHTML });
    }, []);

    // Widget change handler
    const handleWidgetChange = useCallback((_wid: string, newContent: any) => {
        const b = blockRef.current;
        if (b.widget) {
            onChangeRef.current(b.id, { widget: { ...b.widget, content: newContent } });
        }
    }, []);

    const glassBg = block.bgColor || 'rgba(255,255,255,0.03)';

    const renderContent = () => {
        if (block.type === 'text') {
            return (
                <div
                    ref={contentRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleTextInput}
                    data-placeholder="Yazın..."
                    style={{
                        outline: 'none', lineHeight: 1.7, fontSize: '0.9rem',
                        color: '#e6edf3', minHeight: '40px', wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                    }}
                    className="ws-canvas-text"
                />
            );
        }

        // Widget block (task / table)
        if (block.widget) {
            switch (block.widget.type) {
                case 'task':
                    return <TaskWidget widget={block.widget} onChange={handleWidgetChange} />;
                case 'table':
                    return <TableWidget widget={block.widget} onChange={handleWidgetChange} />;
                default:
                    return <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>Bilinmeyen widget</div>;
            }
        }

        return null;
    };

    return (
        <div
            style={{
                position: 'absolute', left: block.pos.x, top: block.pos.y,
                width: block.size.w, minHeight: block.size.h,
                zIndex: focused || dragging ? 100 : 1,
                userSelect: dragging ? 'none' : 'text',
            }}
            onFocus={() => setFocused(true)}
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocused(false); }}
            tabIndex={-1}
        >
            <div style={{
                background: glassBg,
                border: `1px solid ${focused || dragging ? 'rgba(88,188,220,0.35)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '14px', padding: '12px 14px',
                boxShadow: focused
                    ? '0 4px 32px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.05)'
                    : '0 2px 12px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(255,255,255,0.03)',
                backdropFilter: 'blur(16px) saturate(1.4)',
                WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                overflow: 'visible', position: 'relative', minHeight: block.size.h,
            }}>
                {/* Top toolbar */}
                <div style={{
                    position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
                    display: focused || dragging ? 'flex' : 'none',
                    alignItems: 'center', gap: '4px',
                    background: 'rgba(20,24,30,0.95)', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)', padding: '2px 6px', zIndex: 10,
                }}>
                    <div onMouseDown={onDragMouseDown} style={{ cursor: 'grab', display: 'flex', alignItems: 'center', padding: '2px 4px', color: 'rgba(255,255,255,0.4)' }}>
                        <GripHorizontal size={13} />
                    </div>
                    <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.1)' }} />
                    <BlockColorPicker currentColor={block.bgColor} onChange={(c) => onChange(block.id, { bgColor: c })} />
                    <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.1)' }} />
                    <button onClick={() => onRemove(block.id)} style={{
                        background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,80,80,0.7)',
                        display: 'flex', alignItems: 'center', padding: '2px 4px',
                    }}>
                        <Trash2 size={12} />
                    </button>
                </div>

                {renderContent()}

                {/* Resize handle */}
                <div onMouseDown={onResizeMouseDown} style={{
                    position: 'absolute', right: '-2px', bottom: '-2px',
                    width: '20px', height: '20px', cursor: 'se-resize',
                    opacity: focused || dragging ? 0.6 : 0.15, transition: 'opacity 0.15s',
                }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" style={{ display: 'block' }}>
                        <line x1="16" y1="4" x2="4" y2="16" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
                        <line x1="16" y1="10" x2="10" y2="16" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                </div>
            </div>
        </div>
    );
});

// ─── Context Menu ─────────────────────────────────────────────────────────────

function CanvasContextMenu({
    pos, onAdd, onClose,
}: {
    pos: { x: number; y: number };
    onAdd: (type: CanvasBlockType, pos: Position) => void;
    onClose: () => void;
}) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('mousedown', h);
        window.addEventListener('keydown', esc);
        return () => { window.removeEventListener('mousedown', h); window.removeEventListener('keydown', esc); };
    }, [onClose]);

    const items: { type: CanvasBlockType; label: string; desc: string; icon: React.ElementType; color: string }[] = [
        { type: 'text', label: 'Metin Bloğu', desc: 'Serbest düz metin', icon: StickyNote, color: '#79c0ff' },
        { type: 'task', label: 'Görev Listesi', desc: 'Tamamlanabilir maddeler', icon: ListTodo, color: '#ffa657' },
        { type: 'table', label: 'Veri Tablosu', desc: 'Serbest girişli tablo matrisi', icon: TableIcon, color: '#e3b341' },
    ];

    return (
        <div ref={ref} style={{
            position: 'fixed', top: pos.y, left: pos.x, zIndex: 9999,
            background: 'rgba(16,20,26,0.97)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '14px', padding: '8px', width: '240px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.6)', backdropFilter: 'blur(24px)',
        }}>
            <div style={{ padding: '4px 10px 8px', fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Blok Ekle
            </div>
            {items.map(({ type, label, desc, icon: Icon, color }) => (
                <button key={type}
                    onClick={() => { onAdd(type, { x: pos.x, y: pos.y }); onClose(); }}
                    style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
                        background: 'transparent', border: 'none', textAlign: 'left', transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                    <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={15} style={{ color }} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#e6edf3' }}>{label}</div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>{desc}</div>
                    </div>
                </button>
            ))}
        </div>
    );
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

export function WorkspaceEditor({ document: doc, onDelete, isSidebarClosed }: WorkspaceEditorProps) {
    const queryClient = useQueryClient();
    const [title, setTitle] = useState(doc.title);
    const [blocks, setBlocks] = useState<CanvasBlock[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
    const titleRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const titleSyncRef = useRef(title);
    titleSyncRef.current = title;

    // Parse saved content — handle both old format (linear blocks) and new (canvas blocks)
    useEffect(() => {
        setTitle(doc.title);
        if (titleRef.current) titleRef.current.textContent = doc.title;
        try {
            const parsed = JSON.parse(doc.content || '[]');
            if (Array.isArray(parsed) && parsed.length > 0) {
                // Check if it's already the new canvas format (has pos/size)
                if (parsed[0].pos && parsed[0].size) {
                    setBlocks(parsed);
                } else {
                    // Migrate old format: convert linear blocks to canvas blocks
                    const migrated: CanvasBlock[] = [];
                    let yPos = 0;
                    for (const b of parsed) {
                        if (b.type === 'text') {
                            migrated.push({
                                id: b.id || uuidv4(),
                                type: 'text',
                                pos: { x: 40, y: yPos },
                                size: { w: 400, h: 90 },
                                html: b.html || '',
                            });
                            yPos += 110;
                        } else if (b.type === 'widget' && b.widget) {
                            migrated.push({
                                id: b.id || uuidv4(),
                                type: b.widget.type as CanvasBlockType,
                                pos: { x: 40, y: yPos },
                                size: { w: b.widget.type === 'table' ? 400 : 300, h: 140 },
                                widget: b.widget,
                            });
                            yPos += 160;
                        }
                    }
                    setBlocks(migrated.length > 0 ? migrated : []);
                }
            } else {
                setBlocks([]);
            }
        } catch {
            setBlocks([]);
        }
    }, [doc.id]);

    const updateMutation = useMutation({
        mutationFn: async (data: { title?: string; content?: string }) =>
            workspaceApi.updateDocument(doc.id, data),
        onMutate: () => setIsSaving(true),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspace-documents'] }),
        onSettled: () => setIsSaving(false),
    });

    const debouncedSave = useCallback(
        debounce((t: string, b: CanvasBlock[]) => {
            updateMutation.mutate({ title: t, content: JSON.stringify(b) });
        }, 1000),
        [doc.id]
    );

    const changeBlock = useCallback((id: string, patch: Partial<CanvasBlock>) => {
        setBlocks(prev => {
            const next = prev.map(b => b.id === id ? { ...b, ...patch } : b);
            debouncedSave(titleSyncRef.current, next);
            return next;
        });
    }, [debouncedSave]);

    const removeBlock = useCallback((id: string) => {
        setBlocks(prev => {
            const next = prev.filter(b => b.id !== id);
            debouncedSave(titleSyncRef.current, next);
            return next;
        });
    }, [debouncedSave]);

    const addBlock = useCallback((type: CanvasBlockType, screenPos: Position) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        const scrollTop = canvasRef.current?.scrollTop ?? 0;
        const scrollLeft = canvasRef.current?.scrollLeft ?? 0;
        const canvasX = rect ? screenPos.x - rect.left + scrollLeft : screenPos.x;
        const canvasY = rect ? screenPos.y - rect.top + scrollTop : screenPos.y;

        const sizeMap: Record<CanvasBlockType, Size> = {
            text: { w: 300, h: 90 },
            task: { w: 300, h: 120 },
            table: { w: 400, h: 160 },
        };

        const widget: BaseWidget | undefined =
            type === 'task' ? { id: uuidv4(), type: 'task', content: { tasks: [] } } :
                type === 'table' ? { id: uuidv4(), type: 'table', content: { headers: ['Sütun 1', 'Sütun 2'], rows: [['', '']] } } :
                    undefined;

        const newBlock: CanvasBlock = {
            id: uuidv4(),
            type,
            pos: { x: Math.max(0, canvasX - 100), y: Math.max(0, canvasY - 20) },
            size: sizeMap[type],
            ...(type === 'text' ? { html: '' } : { widget }),
        };
        setBlocks(prev => {
            const next = [...prev, newBlock];
            debouncedSave(titleSyncRef.current, next);
            return next;
        });
    }, [debouncedSave]);

    const handleTitleInput = useCallback(() => {
        const t = titleRef.current?.textContent ?? '';
        setTitle(t);
        debouncedSave(t, blocks);
    }, [blocks, debouncedSave]);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setCtxMenu({ x: e.clientX, y: e.clientY });
    }, []);

    const closeCtxMenu = useCallback(() => setCtxMenu(null), []);

    // Canvas bounding
    const canvasW = Math.max(1200, ...blocks.map(b => b.pos.x + b.size.w + 80));
    const canvasH = Math.max(600, ...blocks.map(b => b.pos.y + b.size.h + 120));

    return (
        <>
            <FloatingToolbar />

            <div className="flex-1 flex flex-col h-full overflow-auto" style={{
                backgroundColor: '#0d1117',
                backgroundImage: `
                    linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
                `,
                backgroundSize: '60px 60px',
            }}>
                {/* Title Bar */}
                <div style={{
                    padding: isSidebarClosed ? '32px 48px 16px' : '32px 48px 16px',
                    maxWidth: '860px', width: '100%', margin: '0 auto',
                    display: 'flex', alignItems: 'center', gap: '12px',
                }}>
                    {isSaving && <Loader2 size={14} style={{ color: 'rgba(255,255,255,0.3)', animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
                    <div
                        ref={titleRef}
                        contentEditable
                        suppressContentEditableWarning
                        onInput={handleTitleInput}
                        data-placeholder="Başlıksız"
                        style={{
                            fontSize: '2rem', fontWeight: 700, color: '#e6edf3',
                            outline: 'none', wordBreak: 'break-word', lineHeight: 1.3,
                            minHeight: '44px', flex: 1,
                        }}
                        className="ws-doc-title"
                    />
                </div>

                {/* Canvas Area */}
                <div
                    ref={canvasRef}
                    onContextMenu={handleContextMenu}
                    style={{
                        position: 'relative', flex: 1,
                        minHeight: '500px', cursor: 'crosshair',
                    }}
                >
                    {blocks.length === 0 && (
                        <div style={{
                            position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
                            textAlign: 'center', color: 'rgba(255,255,255,0.18)', pointerEvents: 'none',
                        }}>
                            <StickyNote size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
                            <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>Sağ tıkla ve blok ekle</div>
                            <div style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.6 }}>Metin, görev listesi veya tablo</div>
                        </div>
                    )}

                    <div style={{ position: 'relative', width: canvasW, minHeight: canvasH }}>
                        {blocks.map(block => (
                            <CanvasBlockItem
                                key={block.id}
                                block={block}
                                onChange={changeBlock}
                                onRemove={removeBlock}
                                canvasRef={canvasRef}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {ctxMenu && (
                <CanvasContextMenu pos={ctxMenu} onAdd={addBlock} onClose={closeCtxMenu} />
            )}

            <style>{`
                .ws-canvas-text:empty:before {
                    content: attr(data-placeholder);
                    color: rgba(230,237,243,0.2);
                    pointer-events: none;
                }
                .ws-doc-title:empty:before {
                    content: attr(data-placeholder);
                    color: rgba(230,237,243,0.15);
                    pointer-events: none;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </>
    );
}
