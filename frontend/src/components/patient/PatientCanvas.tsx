'use client';

import * as React from 'react';
import { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
    Table as TableIcon, Link2, StickyNote, FileUp, Pill,
    Bold, Italic, Underline, Strikethrough, Highlighter, Palette,
    Trash2, GripHorizontal, AlignLeft, AlignCenter, AlignRight, Plus,
    X, Image as ImageIcon, Upload, Paperclip,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

type BlockType = 'text' | 'table' | 'link' | 'prescription' | 'file';

interface Position { x: number; y: number; }
interface Size { w: number; h: number; }


interface PrescriptionItem {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    notes: string;
}

interface FileAttachment {
    id: string;
    name: string;
    type: string;
    dataUrl: string;
}

interface CanvasBlock {
    id: string;
    type: BlockType;
    pos: Position;
    size: Size;
    html?: string;
    url?: string;
    headers?: string[];
    rows?: string[][];
    prescriptions?: PrescriptionItem[];
    files?: FileAttachment[];
    bgColor?: string;
}

// ─── Block Color Palette ──────────────────────────────────────────────────────

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

// ─── Floating Rich-text Toolbar (memoized) ────────────────────────────────────

const TEXT_COLORS = ['#e6edf3', '#ff7b72', '#ffa657', '#e3b341', '#7ee787', '#79c0ff', '#d2a8ff'];

const FloatingToolbar = memo(function FloatingToolbar() {
    const [visible, setVisible] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const [showColors, setShowColors] = useState(false);
    const [showHighlight, setShowHighlight] = useState(false);
    const rafRef = useRef<number>(0);

    useEffect(() => {
        const onSel = () => {
            // Throttle via rAF to prevent excessive state updates
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
        return () => {
            document.removeEventListener('selectionchange', onSel);
            cancelAnimationFrame(rafRef.current);
        };
    }, []);

    const cmd = useCallback((c: string, v?: string) => document.execCommand(c, false, v), []);

    if (!visible) return null;
    return (
        <div
            onMouseDown={(e) => e.preventDefault()}
            style={{
                position: 'fixed', top: pos.top, left: pos.left, transform: 'translateX(-50%)',
                zIndex: 9999, display: 'flex', alignItems: 'center', gap: '2px',
                padding: '4px 8px', borderRadius: '10px',
                background: 'rgba(20,24,30,0.95)', border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(20px)',
            }}
        >
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
                <button onMouseDown={() => { setShowColors(!showColors); setShowHighlight(false); }}
                    style={{ padding: '4px 6px', borderRadius: '6px', background: showColors ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: '#e6edf3', cursor: 'pointer', display: 'flex' }}>
                    <Palette size={13} />
                </button>
                {showColors && (
                    <div style={{ position: 'absolute', top: '32px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(20,24,30,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px', width: '90px', zIndex: 10000 }}>
                        {TEXT_COLORS.map(c => <button key={c} onMouseDown={() => { cmd('foreColor', c); setShowColors(false); }}
                            style={{ width: '18px', height: '18px', borderRadius: '4px', background: c, border: '2px solid transparent', cursor: 'pointer' }} />)}
                    </div>
                )}
            </div>
            <div style={{ position: 'relative' }}>
                <button onMouseDown={() => { setShowHighlight(!showHighlight); setShowColors(false); }}
                    style={{ padding: '4px 6px', borderRadius: '6px', background: showHighlight ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: '#e6edf3', cursor: 'pointer', display: 'flex' }}>
                    <Highlighter size={13} />
                </button>
                {showHighlight && (
                    <div style={{ position: 'absolute', top: '32px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(20,24,30,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px', width: '90px', zIndex: 10000 }}>
                        {['#ffd70040', '#ff6b6b40', '#4fc3f740', '#81c78440', '#ab47bc40', 'transparent'].map(c =>
                            <button key={c} onMouseDown={() => { cmd('hiliteColor', c || 'transparent'); setShowHighlight(false); }}
                                style={{ width: '18px', height: '18px', borderRadius: '4px', background: c || '#ffffff20', border: '2px solid rgba(255,255,255,0.2)', cursor: 'pointer' }} />)}
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

// ─── Color Picker Popover ─────────────────────────────────────────────────────

const BlockColorPicker = memo(function BlockColorPicker({ currentColor, onChange }: { currentColor?: string; onChange: (color: string) => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        window.addEventListener('mousedown', handler);
        return () => window.removeEventListener('mousedown', handler);
    }, [open]);

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button
                onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
                title="Blok rengi"
                style={{
                    width: '18px', height: '18px', borderRadius: '6px',
                    background: currentColor || 'rgba(255,255,255,0.06)',
                    border: '2px solid rgba(255,255,255,0.2)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
            >
                <Palette size={9} style={{ color: 'rgba(255,255,255,0.5)' }} />
            </button>
            {open && (
                <div style={{
                    position: 'absolute', top: '24px', right: 0, zIndex: 10000,
                    background: 'rgba(20,24,30,0.97)', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '10px', padding: '8px', width: '140px',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.6)', backdropFilter: 'blur(16px)',
                }}>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                        Blok Rengi
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {BLOCK_COLORS.map(c => (
                            <button
                                key={c.value || 'default'}
                                title={c.label}
                                onClick={(e) => { e.stopPropagation(); onChange(c.value); setOpen(false); }}
                                style={{
                                    width: '22px', height: '22px', borderRadius: '6px',
                                    background: c.value || 'rgba(255,255,255,0.04)',
                                    border: (currentColor || '') === c.value ? '2px solid rgba(88,188,220,0.7)' : '2px solid rgba(255,255,255,0.1)',
                                    cursor: 'pointer',
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
});

// ─── Individual Canvas Block (memoized) ───────────────────────────────────────

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
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Keep stable references for callbacks used in effects
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const blockRef = useRef(block);
    blockRef.current = block;

    // Sync content from block to DOM
    useEffect(() => {
        if (contentRef.current && block.type === 'text') {
            if (contentRef.current.innerHTML !== (block.html ?? '')) {
                contentRef.current.innerHTML = block.html ?? '';
            }
        }
    }, [block.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Drag handlers (use refs for stable closures) ──
    const onDragMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        const b = blockRef.current;
        dragStart.current = { mx: e.clientX, my: e.clientY, bx: b.pos.x, by: b.pos.y };
        setDragging(true);
    }, []);

    useEffect(() => {
        if (!dragging) return;
        const onMove = (e: MouseEvent) => {
            if (!dragStart.current || !canvasRef.current) return;
            const dx = e.clientX - dragStart.current.mx;
            const dy = e.clientY - dragStart.current.my;
            const newX = Math.max(0, dragStart.current.bx + dx);
            const newY = Math.max(0, dragStart.current.by + dy);
            onChangeRef.current(blockRef.current.id, { pos: { x: newX, y: newY } });
        };
        const onUp = () => setDragging(false);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [dragging, canvasRef]);

    // ── Resize handlers (use refs for stable closures) ──
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
                size: {
                    w: Math.max(140, resizeStart.current.bw + dx),
                    h: Math.max(60, resizeStart.current.bh + dy),
                },
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





    // ── Table helpers ──
    const updateTableCell = useCallback((ri: number, ci: number, val: string) => {
        const b = blockRef.current;
        const rows = (b.rows || []).map((r, i) => i === ri ? r.map((c, j) => j === ci ? val : c) : r);
        onChangeRef.current(b.id, { rows });
    }, []);

    const updateTableHeader = useCallback((ci: number, val: string) => {
        const b = blockRef.current;
        const headers = (b.headers || []).map((h, i) => i === ci ? val : h);
        onChangeRef.current(b.id, { headers });
    }, []);

    const addTableRow = useCallback(() => {
        const b = blockRef.current;
        onChangeRef.current(b.id, { rows: [...(b.rows || []), (b.headers || []).map(() => '')] });
    }, []);

    const addTableCol = useCallback(() => {
        const b = blockRef.current;
        onChangeRef.current(b.id, {
            headers: [...(b.headers || []), 'Sütun'],
            rows: (b.rows || []).map(r => [...r, '']),
        });
    }, []);

    // ── Prescription helpers ──
    const addPrescription = useCallback(() => {
        const p: PrescriptionItem = { id: uuidv4(), name: '', dosage: '', frequency: '', duration: '', notes: '' };
        const b = blockRef.current;
        onChangeRef.current(b.id, { prescriptions: [...(b.prescriptions || []), p] });
    }, []);

    const updatePrescription = useCallback((pid: string, field: keyof PrescriptionItem, value: string) => {
        const b = blockRef.current;
        const next = (b.prescriptions || []).map(p => p.id === pid ? { ...p, [field]: value } : p);
        onChangeRef.current(b.id, { prescriptions: next });
    }, []);

    const removePrescription = useCallback((pid: string) => {
        const b = blockRef.current;
        onChangeRef.current(b.id, { prescriptions: (b.prescriptions || []).filter(p => p.id !== pid) });
    }, []);

    // ── File helpers ──
    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files;
        if (!fileList) return;
        Array.from(fileList).forEach(f => {
            const reader = new FileReader();
            reader.onload = () => {
                const attachment: FileAttachment = {
                    id: uuidv4(),
                    name: f.name,
                    type: f.type,
                    dataUrl: reader.result as string,
                };
                const b = blockRef.current;
                onChangeRef.current(b.id, { files: [...(b.files || []), attachment] });
            };
            reader.readAsDataURL(f);
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, []);

    const removeFile = useCallback((fid: string) => {
        const b = blockRef.current;
        onChangeRef.current(b.id, { files: (b.files || []).filter(f => f.id !== fid) });
    }, []);

    // ── Glass background ──
    const glassBg = block.bgColor || 'rgba(255,255,255,0.03)';

    const renderContent = () => {
        switch (block.type) {
            case 'text':
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
                        className="patient-canvas-text"
                    />
                );

            case 'link':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Link2 size={11} /> Bağlantı
                        </div>
                        <input
                            value={block.url || ''}
                            onChange={(e) => onChange(block.id, { url: e.target.value })}
                            placeholder="https://..."
                            style={{
                                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '6px', padding: '6px 8px', color: '#79c0ff',
                                fontSize: '0.8rem', outline: 'none', width: '100%',
                            }}
                        />
                        {block.url && (
                            <a href={block.url} target="_blank" rel="noreferrer"
                                style={{ fontSize: '0.8rem', color: '#79c0ff', textDecoration: 'underline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {block.url}
                            </a>
                        )}
                    </div>
                );



            case 'table':
                return (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.8rem' }}>
                            <thead>
                                <tr>
                                    {(block.headers || []).map((h, ci) => (
                                        <th key={ci} style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                            <input value={h} onChange={(e) => updateTableHeader(ci, e.target.value)}
                                                style={{ background: 'transparent', border: 'none', outline: 'none', color: '#e6edf3', fontWeight: 600, width: '100%', textAlign: 'center' }} />
                                        </th>
                                    ))}
                                    <th style={{ padding: '4px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                        <button onClick={addTableCol} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.7rem' }}>+</button>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {(block.rows || []).map((row, ri) => (
                                    <tr key={ri}>
                                        {row.map((cell, ci) => (
                                            <td key={ci} style={{ padding: '2px 6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                <input value={cell} onChange={(e) => updateTableCell(ri, ci, e.target.value)}
                                                    style={{ background: 'transparent', border: 'none', outline: 'none', color: '#e6edf3', width: '100%' }} />
                                            </td>
                                        ))}
                                        <td style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
                                    </tr>
                                ))}
                                <tr>
                                    <td colSpan={(block.headers || []).length + 1} style={{ padding: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                        <button onClick={addTableRow} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.7rem' }}>+ Satır</button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                );

            case 'prescription':
                return (
                    <div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Pill size={11} /> Reçete / İlaç Geçmişi
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {(block.prescriptions || []).map(p => (
                                <div key={p.id} style={{
                                    background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '8px 10px',
                                    border: '1px solid rgba(255,255,255,0.06)', position: 'relative',
                                }}>
                                    <button onClick={() => removePrescription(p.id)}
                                        style={{
                                            position: 'absolute', top: '4px', right: '4px', background: 'none', border: 'none',
                                            cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: '2px',
                                        }}>
                                        <X size={10} />
                                    </button>
                                    <input
                                        value={p.name}
                                        onChange={(e) => updatePrescription(p.id, 'name', e.target.value)}
                                        placeholder="İlaç adı"
                                        style={{
                                            background: 'transparent', border: 'none', outline: 'none',
                                            color: '#7ee787', fontSize: '0.85rem', fontWeight: 600, width: '90%', marginBottom: '4px',
                                        }}
                                    />
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', marginBottom: '4px' }}>
                                        <input value={p.dosage} onChange={(e) => updatePrescription(p.id, 'dosage', e.target.value)}
                                            placeholder="Doz (ör: 2x1)"
                                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '3px 6px', color: '#e6edf3', fontSize: '0.75rem', outline: 'none' }}
                                        />
                                        <input value={p.frequency} onChange={(e) => updatePrescription(p.id, 'frequency', e.target.value)}
                                            placeholder="Sıklık"
                                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '3px 6px', color: '#e6edf3', fontSize: '0.75rem', outline: 'none' }}
                                        />
                                        <input value={p.duration} onChange={(e) => updatePrescription(p.id, 'duration', e.target.value)}
                                            placeholder="Süre"
                                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '3px 6px', color: '#e6edf3', fontSize: '0.75rem', outline: 'none' }}
                                        />
                                    </div>
                                    <input value={p.notes} onChange={(e) => updatePrescription(p.id, 'notes', e.target.value)}
                                        placeholder="Notlar (ör: Yemeklerden sonra alınmalı)"
                                        style={{ background: 'transparent', border: 'none', outline: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', width: '100%' }}
                                    />
                                </div>
                            ))}
                        </div>
                        <button onClick={addPrescription} style={{
                            marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px',
                            background: 'none', border: '1px dashed rgba(255,255,255,0.12)',
                            borderRadius: '6px', padding: '5px 10px', cursor: 'pointer',
                            color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', width: '100%', justifyContent: 'center',
                        }}>
                            <Plus size={12} /> İlaç Ekle
                        </button>
                    </div>
                );

            case 'file':
                return (
                    <div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Paperclip size={11} /> Dosyalar
                        </div>
                        <input ref={fileInputRef} type="file" multiple accept="*/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {(block.files || []).map(f => (
                                <div key={f.id} style={{ position: 'relative' }}>
                                    {f.type.startsWith('image/') ? (
                                        <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden' }}>
                                            <img src={f.dataUrl} alt={f.name} style={{ width: '100%', borderRadius: '8px', display: 'block' }} loading="lazy" />
                                            <div style={{
                                                position: 'absolute', bottom: 0, left: 0, right: 0,
                                                background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', padding: '16px 8px 6px',
                                                fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            }}>
                                                <span>{f.name}</span>
                                                <button onClick={() => removeFile(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)' }}>
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px',
                                            background: 'rgba(255,255,255,0.04)', borderRadius: '6px',
                                            border: '1px solid rgba(255,255,255,0.06)',
                                        }}>
                                            <FileUp size={14} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
                                            <span style={{ flex: 1, fontSize: '0.8rem', color: '#e6edf3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                                            <button onClick={() => removeFile(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}>
                                                <X size={12} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button onClick={() => fileInputRef.current?.click()} style={{
                            marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px',
                            background: 'none', border: '1px dashed rgba(255,255,255,0.12)',
                            borderRadius: '6px', padding: '8px 10px', cursor: 'pointer',
                            color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', width: '100%', justifyContent: 'center',
                        }}>
                            <Upload size={12} /> Dosya Yükle
                        </button>
                    </div>
                );
        }
    };

    return (
        <div
            style={{
                position: 'absolute',
                left: block.pos.x,
                top: block.pos.y,
                width: block.size.w,
                minHeight: block.size.h,
                zIndex: focused || dragging ? 100 : 1,
                userSelect: dragging ? 'none' : 'text',
            }}
            onFocus={() => setFocused(true)}
            onBlur={(e) => {
                // Only unfocus if the new focus target is outside of this block
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setFocused(false);
                }
            }}
            tabIndex={-1}
        >
            <div
                style={{
                    background: glassBg,
                    border: `1px solid ${focused || dragging ? 'rgba(88,188,220,0.35)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '14px',
                    padding: '12px 14px',
                    boxShadow: focused
                        ? '0 4px 32px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.05)'
                        : '0 2px 12px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(255,255,255,0.03)',
                    backdropFilter: 'blur(16px) saturate(1.4)',
                    WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                    overflow: 'visible',
                    position: 'relative',
                    minHeight: block.size.h,
                }}
            >
                {/* Top toolbar */}
                <div style={{
                    position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
                    display: focused || dragging ? 'flex' : 'none',
                    alignItems: 'center', gap: '4px',
                    background: 'rgba(20,24,30,0.95)', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '2px 6px', zIndex: 10,
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
                <div
                    onMouseDown={onResizeMouseDown}
                    style={{
                        position: 'absolute', right: '-2px', bottom: '-2px',
                        width: '20px', height: '20px', cursor: 'se-resize',
                        opacity: focused || dragging ? 0.6 : 0.15,
                        transition: 'opacity 0.15s',
                    }}
                >
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
    onAdd: (type: BlockType, pos: Position) => void;
    onClose: () => void;
}) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('mousedown', handler);
        window.addEventListener('keydown', esc);
        return () => { window.removeEventListener('mousedown', handler); window.removeEventListener('keydown', esc); };
    }, [onClose]);

    const items: { type: BlockType; label: string; desc: string; icon: React.ElementType; color: string }[] = [
        { type: 'text', label: 'Metin Bloğu', desc: 'Serbest düz metin', icon: StickyNote, color: '#79c0ff' },
        { type: 'prescription', label: 'Reçete', desc: 'İlaç bilgileri ve geçmişi', icon: Pill, color: '#7ee787' },
        { type: 'file', label: 'Dosya / Görsel', desc: 'Dosya yükle, görseller görüntülenir', icon: ImageIcon, color: '#ff79c6' },
        { type: 'table', label: 'Tablo', desc: 'Sütun ve satırlı tablo', icon: TableIcon, color: '#e3b341' },
        { type: 'link', label: 'Bağlantı', desc: 'Harici link ekle', icon: Link2, color: '#d2a8ff' },
    ];

    return (
        <div
            ref={ref}
            style={{
                position: 'fixed', top: pos.y, left: pos.x, zIndex: 9999,
                background: 'rgba(16,20,26,0.97)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '14px', padding: '8px', width: '240px',
                boxShadow: '0 16px 48px rgba(0,0,0,0.6)', backdropFilter: 'blur(24px)',
            }}
        >
            <div style={{ padding: '4px 10px 8px', fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Blok Ekle
            </div>
            {items.map(({ type, label, desc, icon: Icon, color }) => (
                <button
                    key={type}
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

// ─── Main PatientCanvas ───────────────────────────────────────────────────────

interface PatientCanvasProps {
    patientId: string;
    initialContent?: string;
    onSave: (json: string) => void;
}

export function PatientCanvas({ patientId, initialContent, onSave }: PatientCanvasProps) {
    const [blocks, setBlocks] = useState<CanvasBlock[]>([]);
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; canvasX: number; canvasY: number } | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const saveTimer = useRef<ReturnType<typeof setTimeout>>(null);
    const onSaveRef = useRef(onSave);
    onSaveRef.current = onSave;

    // Parse initial content
    useEffect(() => {
        if (initialContent) {
            try {
                const parsed = JSON.parse(initialContent);
                if (Array.isArray(parsed)) { setBlocks(parsed); return; }
            } catch { }
        }
        setBlocks([]);
    }, [patientId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Debounced save using ref for stable callback
    const triggerSave = useCallback((bs: CanvasBlock[]) => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => onSaveRef.current(JSON.stringify(bs)), 1000);
    }, []);

    const changeBlock = useCallback((id: string, patch: Partial<CanvasBlock>) => {
        setBlocks(prev => {
            const next = prev.map(b => b.id === id ? { ...b, ...patch } : b);
            triggerSave(next);
            return next;
        });
    }, [triggerSave]);

    const removeBlock = useCallback((id: string) => {
        setBlocks(prev => {
            const next = prev.filter(b => b.id !== id);
            triggerSave(next);
            return next;
        });
    }, [triggerSave]);

    const addBlock = useCallback((type: BlockType, screenPos: Position) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        const scrollTop = canvasRef.current?.scrollTop ?? 0;
        const scrollLeft = canvasRef.current?.scrollLeft ?? 0;
        const canvasX = rect ? screenPos.x - rect.left + scrollLeft : screenPos.x;
        const canvasY = rect ? screenPos.y - rect.top + scrollTop : screenPos.y;

        const sizeMap: Record<BlockType, Size> = {
            text: { w: 260, h: 90 },
            table: { w: 360, h: 140 },
            link: { w: 260, h: 90 },
            prescription: { w: 340, h: 160 },
            file: { w: 280, h: 120 },
        };

        const defaultContent: Partial<CanvasBlock> =
            type === 'table' ? { headers: ['Sütun 1', 'Sütun 2'], rows: [['', ''], ['', '']] } :
                type === 'link' ? { url: '' } :
                    type === 'prescription' ? { prescriptions: [] } :
                        type === 'file' ? { files: [] } :
                            { html: '' };

        const newBlock: CanvasBlock = {
            id: uuidv4(),
            type,
            pos: { x: Math.max(0, canvasX - 100), y: Math.max(0, canvasY - 20) },
            size: sizeMap[type],
            ...defaultContent,
        };
        setBlocks(prev => {
            const next = [...prev, newBlock];
            triggerSave(next);
            return next;
        });
    }, [triggerSave]);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setCtxMenu({ x: e.clientX, y: e.clientY, canvasX: 0, canvasY: 0 });
    }, []);

    const closeCtxMenu = useCallback(() => setCtxMenu(null), []);

    // Compute canvas bounding size
    const canvasW = Math.max(1200, ...blocks.map(b => b.pos.x + b.size.w + 80));
    const canvasH = Math.max(600, ...blocks.map(b => b.pos.y + b.size.h + 120));

    return (
        <div style={{ position: 'relative' }}>
            <FloatingToolbar />

            {blocks.length === 0 && (
                <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    textAlign: 'center', color: 'rgba(255,255,255,0.18)', pointerEvents: 'none', zIndex: 1,
                }}>
                    <StickyNote size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
                    <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>Sağ tıkla ve blok ekle</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.6 }}>Metin, reçete, dosya, tablo veya bağlantı</div>
                </div>
            )}

            <div
                ref={canvasRef}
                onContextMenu={handleContextMenu}
                style={{
                    position: 'relative',
                    width: '100%',
                    minHeight: '500px',
                    overflow: 'visible',
                    backgroundColor: '#0d1117',
                    backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
                    `,
                    backgroundSize: '60px 60px',
                    borderRadius: '14px',
                    border: '1px solid rgba(255,255,255,0.07)',
                    cursor: 'crosshair',
                }}
            >
                <div style={{ position: 'relative', width: canvasW, height: canvasH }}>
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

            {ctxMenu && (
                <CanvasContextMenu
                    pos={{ x: ctxMenu.x, y: ctxMenu.y }}
                    onAdd={addBlock}
                    onClose={closeCtxMenu}
                />
            )}

            <style>{`
                .patient-canvas-text:empty:before {
                    content: attr(data-placeholder);
                    color: rgba(230,237,243,0.2);
                    pointer-events: none;
                }
            `}</style>
        </div>
    );
}
