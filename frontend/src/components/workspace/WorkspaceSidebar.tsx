'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { WorkspaceDocument, workspaceApi, Teamspace } from '@/lib/workspaceApi';
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor,
    useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    Search, ChevronRight, ChevronDown, Plus, ChevronsLeft,
    FileText, Clock, Lock, Users, GripVertical, Trash2,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreateTeamspaceDialog } from './CreateTeamspaceDialog';

interface WorkspaceSidebarProps {
    documents: WorkspaceDocument[];
    loading: boolean;
    selectedDocId: string | null;
    onSelectDoc: (id: string) => void;
    onCreateDoc: (teamspaceId?: string) => void;
    onDeleteDoc: (id: string) => void;
    onSettingsClick: (id: string) => void;
    isOpen: boolean;
    onToggle: () => void;
}

// ── Sortable Doc Row ──────────────────────────────────────────────────────────
function SortableDocRow({ doc, isActive, onSelect, onDelete }: {
    doc: WorkspaceDocument; isActive: boolean; onSelect: (id: string) => void; onDelete: (id: string) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: doc.id });

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, zIndex: isDragging ? 50 : undefined }}
        >
            <div
                role="button"
                tabIndex={0}
                onClick={() => onSelect(doc.id)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelect(doc.id);
                    }
                }}
                style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '7px 10px', background: isActive ? 'var(--primary-muted)' : 'transparent',
                    border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                    transition: 'background 0.15s', color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                    position: 'relative',
                    outline: 'none',
                }}
                onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)';
                    const grip = e.currentTarget.querySelector<HTMLElement>('.grip-handle');
                    if (grip) grip.style.opacity = '1';
                    const del = e.currentTarget.querySelector<HTMLElement>('.del-handle');
                    if (del) del.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                    const grip = e.currentTarget.querySelector<HTMLElement>('.grip-handle');
                    if (grip) grip.style.opacity = '0';
                    const del = e.currentTarget.querySelector<HTMLElement>('.del-handle');
                    if (del) del.style.opacity = '0';
                }}
            >
                {/* Drag handle */}
                <button
                    className="grip-handle"
                    {...attributes}
                    {...listeners}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        opacity: 0, transition: 'opacity 0.15s', background: 'none', border: 'none',
                        padding: '0 2px', cursor: 'grab', display: 'flex', alignItems: 'center',
                        color: 'var(--text-muted)', flexShrink: 0,
                    }}
                >
                    <GripVertical size={12} />
                </button>

                {/* Icon */}
                <div style={{
                    width: '28px', height: '28px', borderRadius: '7px',
                    background: isActive ? 'var(--primary)' : 'var(--bg-elevated)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                    <FileText size={13} style={{ color: isActive ? '#fff' : 'var(--text-muted)' }} />
                </div>

                {/* Text — title only, no date */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontSize: '0.8125rem', fontWeight: 500, whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        color: isActive ? 'var(--primary)' : 'var(--text-primary)',
                    }}>
                        {doc.title || 'Başlıksız'}
                    </div>
                </div>

                {/* Delete button — right side */}
                <button
                    className="del-handle"
                    onClick={(e) => { e.stopPropagation(); onDelete(doc.id); }}
                    title="Sil"
                    style={{
                        opacity: 0, transition: 'opacity 0.15s', background: 'none', border: 'none',
                        padding: '2px 4px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                        color: 'rgba(255,80,80,0.6)', flexShrink: 0, borderRadius: '4px',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#ff6b6b'; e.currentTarget.style.background = 'rgba(255,80,80,0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,80,80,0.6)'; e.currentTarget.style.background = 'none'; }}
                >
                    <Trash2 size={12} />
                </button>
            </div>
        </div>
    );
}

// ── Section ───────────────────────────────────────────────────────────────────
function Section({
    title, icon: Icon, docs, isOpen, onToggle, onAdd, selectedDocId, onSelectDoc, onUpdateOrder, onDeleteDoc,
    accent, teamspaceEmoji,
}: {
    title: string; icon?: any; teamspaceEmoji?: string;
    docs: WorkspaceDocument[]; isOpen: boolean; onToggle: () => void;
    onAdd?: () => void; selectedDocId: string | null; onSelectDoc: (id: string) => void;
    onUpdateOrder: (id: string, order: number) => void;
    onDeleteDoc: (id: string) => void;
    accent?: string;
}) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const [localDocs, setLocalDocs] = useState(docs);
    useEffect(() => { setLocalDocs(docs); }, [docs]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setLocalDocs(items => {
                const oldIdx = items.findIndex(i => i.id === active.id);
                const newIdx = items.findIndex(i => i.id === over.id);
                const next = arrayMove(items, oldIdx, newIdx);
                onUpdateOrder(active.id as string, newIdx);
                return next;
            });
        }
    };

    return (
        <div style={{ marginBottom: '4px' }}>
            {/* Section header */}
            <div
                onClick={onToggle}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '5px 8px', marginBottom: '2px', cursor: 'pointer', borderRadius: '7px',
                    transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isOpen ? <ChevronDown size={11} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={11} style={{ color: 'var(--text-muted)' }} />}
                    {teamspaceEmoji ? (
                        <span style={{ fontSize: '0.875rem', lineHeight: 1 }}>{teamspaceEmoji}</span>
                    ) : Icon ? (
                        <Icon size={11} style={{ color: accent || 'var(--text-muted)' }} />
                    ) : null}
                    <span style={{
                        fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.06em', color: accent || 'var(--text-muted)',
                    }}>
                        {title}
                    </span>
                    {docs.length > 0 && (
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', background: 'var(--bg-elevated)', borderRadius: '10px', padding: '1px 5px' }}>
                            {docs.length}
                        </span>
                    )}
                </div>
                {onAdd && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onAdd(); }}
                        style={{
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            padding: '2px 3px', borderRadius: '4px', color: 'var(--text-muted)', display: 'flex',
                        }}
                        title="Yeni sayfa"
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                    >
                        <Plus size={13} />
                    </button>
                )}
            </div>

            {/* Docs */}
            {isOpen && (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={localDocs.map(d => d.id)} strategy={verticalListSortingStrategy}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                            {localDocs.map(doc => (
                                <SortableDocRow
                                    key={doc.id}
                                    doc={doc}
                                    isActive={selectedDocId === doc.id}
                                    onSelect={onSelectDoc}
                                    onDelete={onDeleteDoc}
                                />
                            ))}
                            {localDocs.length === 0 && (
                                <div style={{ padding: '6px 12px', fontSize: '0.8125rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                    Sayfa yok
                                </div>
                            )}
                        </div>
                    </SortableContext>
                </DndContext>
            )}
        </div>
    );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
export function WorkspaceSidebar({
    documents, loading, selectedDocId, onSelectDoc, onCreateDoc, onDeleteDoc, isOpen, onToggle,
}: WorkspaceSidebarProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [localDocs, setLocalDocs] = useState<WorkspaceDocument[]>([]);
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({ private: true });
    const [isCreateTeamspaceOpen, setIsCreateTeamspaceOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: teamspaces = [] } = useQuery<Teamspace[]>({
        queryKey: ['workspace-teamspaces'],
        queryFn: workspaceApi.getTeamspaces,
    });

    useEffect(() => {
        setLocalDocs([...documents].sort((a, b) => a.order - b.order));
    }, [documents]);

    const updateOrderMutation = useMutation({
        mutationFn: ({ id, order }: { id: string; order: number }) =>
            workspaceApi.updateDocument(id, { order }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspace-documents'] }),
    });

    const handleUpdateOrder = (id: string, order: number) => {
        updateOrderMutation.mutate({ id, order });
    };

    const toggleSection = (key: string) => {
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const displayedDocs = localDocs.filter(doc =>
        doc.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const recentDocs = [...displayedDocs]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 3);
    const privateDocs = displayedDocs.filter(doc => !doc.teamspaceId);

    return (
        <div style={{
            height: '100%',
            width: isOpen ? '300px' : '0px',
            minWidth: isOpen ? '300px' : '0px',
            background: 'var(--bg-surface)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'width 0.3s, min-width 0.3s, opacity 0.3s',
            opacity: isOpen ? 1 : 0,
            flexShrink: 0,
        }}>


            {/* Search */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        placeholder="Sayfalarda ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%', background: 'var(--bg-elevated)',
                            border: '1px solid var(--border)', borderRadius: '8px',
                            padding: '6px 10px 6px 30px', fontSize: '0.8125rem',
                            color: 'var(--text-primary)', outline: 'none',
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                    />
                </div>
            </div>

            {/* Sections */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>

                {/* Recents */}
                {recentDocs.length > 0 && !searchTerm && (
                    <Section
                        title="Son Açılanlar"
                        icon={Clock}
                        docs={recentDocs}
                        isOpen={openSections['recents'] !== false}
                        onToggle={() => toggleSection('recents')}
                        selectedDocId={selectedDocId}
                        onSelectDoc={onSelectDoc}
                        onUpdateOrder={handleUpdateOrder}
                        onDeleteDoc={onDeleteDoc}
                    />
                )}

                {/* Private */}
                <Section
                    title="Özel"
                    icon={Lock}
                    docs={privateDocs}
                    isOpen={openSections['private'] !== false}
                    onToggle={() => toggleSection('private')}
                    onAdd={() => onCreateDoc()}
                    selectedDocId={selectedDocId}
                    onSelectDoc={onSelectDoc}
                    onUpdateOrder={handleUpdateOrder}
                    onDeleteDoc={onDeleteDoc}
                />

                {/* Teamspaces — each one is a section like Özel */}
                {teamspaces.map(ts => {
                    const tsDocs = displayedDocs.filter(d => d.teamspaceId === ts.id);
                    return (
                        <Section
                            key={ts.id}
                            title={ts.name}
                            teamspaceEmoji={ts.icon || '🏢'}
                            docs={tsDocs}
                            isOpen={openSections[ts.id] !== false}
                            onToggle={() => toggleSection(ts.id)}
                            onAdd={() => onCreateDoc(ts.id)}
                            selectedDocId={selectedDocId}
                            onSelectDoc={onSelectDoc}
                            onUpdateOrder={handleUpdateOrder}
                            onDeleteDoc={onDeleteDoc}
                        />
                    );
                })}

                {/* New Teamspace */}
                <button
                    onClick={() => setIsCreateTeamspaceOpen(true)}
                    style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '5px 8px', background: 'transparent', border: 'none',
                        borderRadius: '7px', cursor: 'pointer', fontSize: '0.75rem',
                        color: 'var(--text-muted)', marginTop: '8px', transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                    <Users size={12} />
                    <Plus size={10} />
                    <span>Yeni Teamspace</span>
                </button>

            </div>

            {/* New page button */}
            <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
                <button
                    onClick={() => onCreateDoc()}
                    style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '8px 12px', borderRadius: '8px', background: 'transparent',
                        border: '1px dashed var(--border)', color: 'var(--text-muted)',
                        cursor: 'pointer', fontSize: '0.8125rem', transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary-muted)'; e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                    <Plus size={14} />
                    Yeni Sayfa
                </button>
            </div>

            <CreateTeamspaceDialog
                open={isCreateTeamspaceOpen}
                onOpenChange={setIsCreateTeamspaceOpen}
            />
        </div>
    );
}
