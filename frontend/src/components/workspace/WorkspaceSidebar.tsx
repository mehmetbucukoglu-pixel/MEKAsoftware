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
    FileText, Clock, Lock, Users, GripVertical, Trash2, Home
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
                    padding: '6px 8px', background: isActive ? 'rgba(88, 166, 255, 0.08)' : 'transparent',
                    border: 'none', borderRadius: '6px', cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.2s ease', color: isActive ? '#58a6ff' : 'rgba(255,255,255,0.6)',
                    position: 'relative',
                    outline: 'none',
                    marginBottom: '2px'
                }}
                onMouseEnter={(e) => {
                    if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                    }
                    const grip = e.currentTarget.querySelector<HTMLElement>('.grip-handle');
                    if (grip) grip.style.opacity = '1';
                    const del = e.currentTarget.querySelector<HTMLElement>('.del-handle');
                    if (del) del.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                    if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                    }
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
                        opacity: 0, transition: 'opacity 0.2s', background: 'none', border: 'none',
                        padding: '0 4px 0 0', cursor: 'grab', display: 'flex', alignItems: 'center',
                        color: 'rgba(255,255,255,0.3)', flexShrink: 0,
                    }}
                >
                    <GripVertical size={12} />
                </button>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={12} style={{ color: isActive ? '#58a6ff' : 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
                    <div style={{
                        fontSize: '0.8125rem', fontWeight: isActive ? 500 : 400, whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                        {doc.title || 'Başlıksız'}
                    </div>
                </div>

                {/* Delete button */}
                <button
                    className="del-handle"
                    onClick={(e) => { e.stopPropagation(); onDelete(doc.id); }}
                    title="Sil"
                    style={{
                        opacity: 0, transition: 'opacity 0.2s', background: 'none', border: 'none',
                        padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                        color: 'rgba(255,80,80,0.5)', flexShrink: 0, borderRadius: '4px',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#ff6b6b'; e.currentTarget.style.background = 'rgba(255,80,80,0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,80,80,0.5)'; e.currentTarget.style.background = 'none'; }}
                >
                    <Trash2 size={12} />
                </button>
            </div>
        </div>
    );
}

// ── Section ───────────────────────────────────────────────────────────────────
function Section({
    title, icon: Icon, docs, isOpen, onToggle, onAdd, selectedDocId, onSelectDoc, onUpdateOrder, onDeleteDoc, onDeleteTeamspace,
    accent, teamspaceEmoji,
}: {
    title: string; icon?: any; teamspaceEmoji?: string;
    docs: WorkspaceDocument[]; isOpen: boolean; onToggle: () => void;
    onAdd?: () => void; selectedDocId: string | null; onSelectDoc: (id: string) => void;
    onUpdateOrder: (id: string, order: number) => void;
    onDeleteDoc: (id: string) => void;
    onDeleteTeamspace?: () => void;
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
        <div style={{ marginBottom: '12px' }}>
            {/* Section header */}
            <div
                className="section-header"
                onClick={onToggle}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '4px 8px', marginBottom: '4px', cursor: 'pointer', borderRadius: '6px',
                    transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '16px', height: '16px', color: 'rgba(255,255,255,0.3)',
                        transition: 'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0)'
                    }}>
                        <ChevronRight size={12} />
                    </div>
                    {teamspaceEmoji ? (
                        <span style={{ fontSize: '0.85rem', lineHeight: 1 }}>{teamspaceEmoji}</span>
                    ) : Icon ? (
                        <Icon size={12} style={{ color: accent || 'rgba(255,255,255,0.4)' }} />
                    ) : null}
                    <span style={{
                        fontSize: '0.7rem', fontWeight: 600, color: accent || 'rgba(255,255,255,0.4)',
                        letterSpacing: '0.04em'
                    }}>
                        {title}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                    {onAdd && (
                        <button
                            className="section-add-btn"
                            onClick={(e) => { e.stopPropagation(); onAdd(); }}
                            style={{
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                padding: '4px', borderRadius: '4px', color: 'rgba(255,255,255,0.3)', display: 'flex',
                                opacity: 0, transition: 'all 0.2s'
                            }}
                            title="Yeni sayfa"
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
                        >
                            <Plus size={12} />
                        </button>
                    )}
                    {onDeleteTeamspace && (
                        <button
                            className="section-add-btn"
                            onClick={(e) => { e.stopPropagation(); onDeleteTeamspace(); }}
                            style={{
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                padding: '4px', borderRadius: '4px', color: 'rgba(255,255,255,0.3)', display: 'flex',
                                opacity: 0, transition: 'all 0.2s'
                            }}
                            title="Teamspace'i Sil"
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,80,80,0.1)'; e.currentTarget.style.color = '#ff6b6b'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
                        >
                            <Trash2 size={12} />
                        </button>
                    )}
                </div>
            </div>

            {/* Docs */}
            {isOpen && (
                <div style={{ paddingLeft: '24px' }}>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={localDocs.map(d => d.id)} strategy={verticalListSortingStrategy}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
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
                                    <div style={{ padding: '6px 8px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>
                                        Sayfa yok
                                    </div>
                                )}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>
            )}
            
            <style>{`
                .section-header:hover .section-add-btn { opacity: 1 !important; }
            `}</style>
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

    const deleteTeamspaceMutation = useMutation({
        mutationFn: workspaceApi.deleteTeamspace,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workspace-teamspaces'] });
        }
    });

    const handleDeleteTeamspace = (id: string) => {
        if (confirm("Bu Teamspace'i silmek istediğinize emin misiniz?")) {
            deleteTeamspaceMutation.mutate(id);
        }
    };

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
    const privateDocs = displayedDocs.filter(doc => !doc.teamspaceId);

    return (
        <div style={{
            height: '100%',
            width: isOpen ? '260px' : '0px',
            minWidth: isOpen ? '260px' : '0px',
            background: '#0d1117',
            borderRight: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1), min-width 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s',
            opacity: isOpen ? 1 : 0,
            flexShrink: 0,
        }}>
            {/* Header & Search */}
            <div style={{ padding: '16px 12px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingLeft: '4px' }}>
                    <Home size={16} style={{ color: '#58a6ff' }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>Workspace</span>
                </div>
                <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                    <input
                        placeholder="Sayfa ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%', background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px',
                            padding: '6px 10px 6px 32px', fontSize: '0.8rem',
                            color: 'rgba(255,255,255,0.9)', outline: 'none', transition: 'all 0.2s'
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(88,166,255,0.5)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    />
                </div>
            </div>

            {/* Sections */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px' }}>

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

                {/* Teamspaces */}
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
                            onDeleteTeamspace={() => handleDeleteTeamspace(ts.id)}
                        />
                    );
                })}

                {/* New Teamspace */}
                <button
                    onClick={() => setIsCreateTeamspaceOpen(true)}
                    style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '6px 8px', background: 'transparent', border: 'none',
                        borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem',
                        color: 'rgba(255,255,255,0.3)', marginTop: '8px', transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
                >
                    <Users size={14} />
                    <span>Yeni Teamspace</span>
                </button>

            </div>

            {/* New page button */}
            <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <button
                    onClick={() => onCreateDoc()}
                    style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center',
                        padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)',
                        cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
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
