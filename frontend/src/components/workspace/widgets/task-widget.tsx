'use client';

import * as React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { BaseWidget, TaskContent } from './types';
import { Teamspace } from '@/lib/workspaceApi';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Plus, X, Calendar, UserCircle, ChevronDown,
    Check, Edit3,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { workspaceApi } from '@/lib/workspaceApi';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

interface TaskWidgetProps {
    widget: BaseWidget;
    onChange: (id: string, newContent: any) => void;
    isReadOnly?: boolean;
    teamspaceId?: string;
}

interface Task {
    id: string;
    title: string;
    completed: boolean;
    assigneeId?: string;
    assigneeName?: string;
    dueDate?: string;
}

interface Member {
    id: string;
    firstName: string;
    lastName: string;
}

// ─── Assign Dropdown ──────────────────────────────────────────────────────────

function AssignDropdown({ members, currentId, onAssign }: {
    members: Member[];
    currentId?: string;
    onAssign: (id?: string, name?: string) => void;
}) {
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
            <button
                onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
                title="Kişi ata"
                style={{
                    background: currentId ? 'rgba(88,166,255,0.12)' : 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '6px', padding: '2px 6px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '3px',
                    fontSize: '0.7rem', color: currentId ? '#58a6ff' : 'rgba(255,255,255,0.35)',
                    transition: 'all 0.15s', whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(88,166,255,0.3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
            >
                <UserCircle size={11} />
                {currentId ? (
                    <span style={{ maxWidth: '60px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {members.find(m => m.id === currentId)
                            ? `${members.find(m => m.id === currentId)!.firstName}`
                            : 'Atandı'}
                    </span>
                ) : (
                    <span>Ata</span>
                )}
                <ChevronDown size={9} />
            </button>

            {open && (
                <div style={{
                    position: 'absolute', top: '28px', left: 0, zIndex: 10000,
                    background: 'rgba(16,20,26,0.97)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px', padding: '4px', minWidth: '160px',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.6)', backdropFilter: 'blur(16px)',
                }}>
                    {/* Unassign */}
                    {currentId && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onAssign(undefined, undefined); setOpen(false); }}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '6px 10px', borderRadius: '6px', cursor: 'pointer',
                                background: 'transparent', border: 'none', textAlign: 'left',
                                color: 'rgba(255,100,100,0.7)', fontSize: '0.8rem',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                            <X size={12} /> Atamayı kaldır
                        </button>
                    )}
                    {members.length === 0 ? (
                        <div style={{ padding: '8px 10px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                            Teamspace üyesi yok
                        </div>
                    ) : (
                        members.map(m => (
                            <button
                                key={m.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAssign(m.id, `${m.firstName} ${m.lastName}`);
                                    setOpen(false);
                                }}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '6px 10px', borderRadius: '6px', cursor: 'pointer',
                                    background: m.id === currentId ? 'rgba(88,166,255,0.1)' : 'transparent',
                                    border: 'none', textAlign: 'left', fontSize: '0.8rem',
                                    color: m.id === currentId ? '#58a6ff' : '#e6edf3',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = m.id === currentId ? 'rgba(88,166,255,0.1)' : 'transparent')}
                            >
                                <div style={{
                                    width: '22px', height: '22px', borderRadius: '50%',
                                    background: `hsl(${m.firstName.charCodeAt(0) * 7 % 360}, 50%, 40%)`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.65rem', fontWeight: 700, color: '#fff', flexShrink: 0,
                                }}>
                                    {m.firstName[0]}
                                </div>
                                <span>{m.firstName} {m.lastName}</span>
                                {m.id === currentId && <Check size={13} style={{ marginLeft: 'auto', color: '#58a6ff' }} />}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Due Date Picker ──────────────────────────────────────────────────────────

function DueDatePicker({ dueDate, onChange }: { dueDate?: string; onChange: (d?: string) => void }) {
    const inputRef = useRef<HTMLInputElement>(null);

    const isOverdue = dueDate && new Date(dueDate) < new Date(new Date().toDateString());
    const isToday = dueDate && new Date(dueDate).toDateString() === new Date().toDateString();

    const formatDate = (d: string) => {
        const date = new Date(d);
        const day = date.getDate();
        const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
        return `${day} ${months[date.getMonth()]}`;
    };

    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={(e) => { e.stopPropagation(); inputRef.current?.showPicker(); }}
                title="Tarih belirle"
                style={{
                    background: dueDate
                        ? isOverdue ? 'rgba(248,81,73,0.12)' : isToday ? 'rgba(210,153,34,0.12)' : 'rgba(126,231,135,0.08)'
                        : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${dueDate
                        ? isOverdue ? 'rgba(248,81,73,0.25)' : isToday ? 'rgba(210,153,34,0.25)' : 'rgba(126,231,135,0.15)'
                        : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '6px', padding: '2px 6px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '3px',
                    fontSize: '0.7rem',
                    color: dueDate
                        ? isOverdue ? '#f85149' : isToday ? '#e3b341' : '#7ee787'
                        : 'rgba(255,255,255,0.35)',
                    transition: 'all 0.15s', whiteSpace: 'nowrap',
                }}
            >
                <Calendar size={10} />
                {dueDate ? formatDate(dueDate) : 'Tarih'}
            </button>
            <input
                ref={inputRef}
                type="date"
                value={dueDate || ''}
                onChange={(e) => onChange(e.target.value || undefined)}
                style={{
                    position: 'absolute', top: 0, left: 0, width: 0, height: 0,
                    opacity: 0, pointerEvents: 'none',
                }}
            />
            {dueDate && (
                <button
                    onClick={(e) => { e.stopPropagation(); onChange(undefined); }}
                    title="Tarihi kaldır"
                    style={{
                        position: 'absolute', top: '-4px', right: '-4px',
                        width: '14px', height: '14px', borderRadius: '50%',
                        background: 'rgba(255,80,80,0.8)', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.6rem', color: '#fff',
                    }}
                >
                    <X size={8} />
                </button>
            )}
        </div>
    );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({ task, members, onToggle, onEdit, onRemove, onAssign, onDueDate, isReadOnly }: {
    task: Task;
    members: Member[];
    onToggle: () => void;
    onEdit: (newTitle: string) => void;
    onRemove: () => void;
    onAssign: (id?: string, name?: string) => void;
    onDueDate: (d?: string) => void;
    isReadOnly?: boolean;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(task.title);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing) inputRef.current?.focus();
    }, [isEditing]);

    const commitEdit = () => {
        const trimmed = editValue.trim();
        if (trimmed && trimmed !== task.title) onEdit(trimmed);
        else setEditValue(task.title);
        setIsEditing(false);
    };

    return (
        <div
            style={{
                display: 'flex', alignItems: 'flex-start', gap: '8px',
                padding: '8px 10px', borderRadius: '10px',
                background: task.completed ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.04)',
                transition: 'all 0.12s',
                opacity: task.completed ? 0.6 : 1,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = task.completed ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.025)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; }}
        >
            {/* Checkbox */}
            <div style={{ paddingTop: '2px', flexShrink: 0 }}>
                <Checkbox
                    checked={task.completed}
                    onCheckedChange={onToggle}
                    disabled={isReadOnly}
                    className="shrink-0"
                />
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                {/* Title */}
                {isEditing && !isReadOnly ? (
                    <input
                        ref={inputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEdit();
                            if (e.key === 'Escape') { setEditValue(task.title); setIsEditing(false); }
                        }}
                        style={{
                            width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(88,166,255,0.3)',
                            borderRadius: '6px', padding: '2px 6px', fontSize: '0.85rem', color: '#e6edf3',
                            outline: 'none',
                        }}
                    />
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{
                            fontSize: '0.85rem', color: task.completed ? 'rgba(255,255,255,0.35)' : '#e6edf3',
                            textDecoration: task.completed ? 'line-through' : 'none',
                            flex: 1, wordBreak: 'break-word', lineHeight: 1.4,
                            cursor: isReadOnly ? 'default' : 'text',
                        }}
                            onClick={() => { if (!isReadOnly) setIsEditing(true); }}
                        >
                            {task.title}
                        </span>
                        {!isReadOnly && (
                            <button
                                onClick={() => setIsEditing(true)}
                                title="Düzenle"
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: 'rgba(255,255,255,0.2)', display: 'flex',
                                    padding: '2px', flexShrink: 0, opacity: 0,
                                    transition: 'opacity 0.12s',
                                }}
                                className="task-edit-btn"
                            >
                                <Edit3 size={11} />
                            </button>
                        )}
                    </div>
                )}

                {/* Meta row — assignee, due date */}
                {!isReadOnly && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px', flexWrap: 'wrap' }}>
                        <AssignDropdown members={members} currentId={task.assigneeId} onAssign={onAssign} />
                        <DueDatePicker dueDate={task.dueDate} onChange={onDueDate} />
                    </div>
                )}

                {/* Read-only meta */}
                {isReadOnly && (task.assigneeName || task.dueDate) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>
                        {task.assigneeName && <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><UserCircle size={10} /> {task.assigneeName}</span>}
                        {task.dueDate && <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><Calendar size={10} /> {task.dueDate}</span>}
                    </div>
                )}
            </div>

            {/* Delete */}
            {!isReadOnly && (
                <button
                    onClick={onRemove}
                    title="Sil"
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'rgba(255,255,255,0.15)', display: 'flex',
                        padding: '2px', flexShrink: 0, marginTop: '2px',
                        transition: 'color 0.12s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,80,80,0.7)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.15)'; }}
                >
                    <X size={13} />
                </button>
            )}
        </div>
    );
}

// ─── Main Widget ──────────────────────────────────────────────────────────────

export function TaskWidget({ widget, onChange, isReadOnly, teamspaceId }: TaskWidgetProps) {
    const content = (widget.content as TaskContent) || { tasks: [] };
    const tasks: Task[] = content.tasks || [];
    const [newTaskTitle, setNewTaskTitle] = useState('');

    // Fetch all clinic users
    const { data: allUsers = [] } = useQuery<Member[]>({
        queryKey: ['clinic-users'],
        queryFn: async () => {
            const { data } = await api.get('/users');
            return data;
        },
    });

    // Fetch teamspaces to filter members if needed
    const { data: teamspaces = [] } = useQuery<Teamspace[]>({
        queryKey: ['workspace-teamspaces'],
        queryFn: workspaceApi.getTeamspaces,
    });

    let allMembers: Member[] = [];
    if (teamspaceId) {
        const ts = teamspaces.find(t => t.id === teamspaceId);
        allMembers = ts?.members || [];
    } else {
        allMembers = allUsers.map((u: any) => ({
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName
        }));
    }

    const updateTasks = useCallback((newTasks: Task[]) => {
        onChange(widget.id, { tasks: newTasks });
    }, [onChange, widget.id]);

    const handleToggle = (taskId: string) => {
        if (isReadOnly) return;
        updateTasks(tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
    };

    const handleEdit = (taskId: string, newTitle: string) => {
        if (isReadOnly) return;
        updateTasks(tasks.map(t => t.id === taskId ? { ...t, title: newTitle } : t));
    };

    const handleRemove = (taskId: string) => {
        if (isReadOnly) return;
        updateTasks(tasks.filter(t => t.id !== taskId));
    };

    const handleAssign = async (taskId: string, assigneeId?: string, assigneeName?: string) => {
        if (isReadOnly) return;
        const taskToUpdate = tasks.find(t => t.id === taskId);
        updateTasks(tasks.map(t => t.id === taskId ? { ...t, assigneeId, assigneeName } : t));

        if (assigneeId && taskToUpdate && assigneeId !== taskToUpdate.assigneeId) {
            try {
                await api.post('/notifications', {
                    targetUserId: assigneeId,
                    type: 'WORKSPACE_TASK',
                    title: 'Yeni Görev',
                    text: `Size bir görev atandı: "${taskToUpdate.title}"`,
                    entityType: 'TASK',
                    entityId: taskId
                });
                toast.success(`${assigneeName} adlı kullanıcıya bildirim gönderildi`);
            } catch (error) {
                console.error('Bildirim gönderilemedi', error);
            }
        }
    };

    const handleDueDate = (taskId: string, dueDate?: string) => {
        if (isReadOnly) return;
        updateTasks(tasks.map(t => t.id === taskId ? { ...t, dueDate } : t));
    };

    const handleAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && newTaskTitle.trim() && !isReadOnly) {
            updateTasks([...tasks, { id: uuidv4(), title: newTaskTitle.trim(), completed: false }]);
            setNewTaskTitle('');
        }
    };

    const completedCount = tasks.filter(t => t.completed).length;
    const progressPct = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

    return (
        <div style={{ width: '100%' }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '12px', paddingBottom: '8px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                        width: '22px', height: '22px', borderRadius: '6px',
                        background: 'rgba(255,166,87,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Check size={12} style={{ color: '#ffa657' }} />
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Görevler
                    </span>
                </div>

                {tasks.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Progress */}
                        <div style={{
                            width: '60px', height: '5px', borderRadius: '3px',
                            background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
                        }}>
                            <div style={{
                                height: '100%', width: `${progressPct}%`,
                                background: progressPct === 100
                                    ? 'linear-gradient(90deg, #7ee787, #3fb950)'
                                    : 'linear-gradient(90deg, #58a6ff, #388bfd)',
                                borderRadius: '3px', transition: 'width 0.3s ease',
                            }} />
                        </div>
                        <span style={{
                            fontSize: '0.7rem', fontWeight: 600,
                            color: progressPct === 100 ? '#7ee787' : 'rgba(255,255,255,0.4)',
                        }}>
                            {completedCount}/{tasks.length}
                        </span>
                    </div>
                )}
            </div>

            {/* Task list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {tasks.map(task => (
                    <TaskRow
                        key={task.id}
                        task={task}
                        members={allMembers}
                        onToggle={() => handleToggle(task.id)}
                        onEdit={(title) => handleEdit(task.id, title)}
                        onRemove={() => handleRemove(task.id)}
                        onAssign={(id, name) => handleAssign(task.id, id, name)}
                        onDueDate={(d) => handleDueDate(task.id, d)}
                        isReadOnly={isReadOnly}
                    />
                ))}
                {tasks.length === 0 && (
                    <div style={{
                        padding: '16px 0', textAlign: 'center',
                        color: 'rgba(255,255,255,0.15)', fontSize: '0.8rem',
                    }}>
                        Henüz görev yok
                    </div>
                )}
            </div>

            {/* Add new task */}
            {!isReadOnly && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    marginTop: '10px', paddingTop: '10px',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                }}>
                    <div style={{
                        width: '20px', height: '20px', borderRadius: '6px',
                        background: 'rgba(255,255,255,0.04)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                        <Plus size={12} style={{ color: 'rgba(255,255,255,0.25)' }} />
                    </div>
                    <input
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={handleAdd}
                        placeholder="Yeni görev ekle… (Enter)"
                        style={{
                            flex: 1, background: 'transparent', border: 'none',
                            outline: 'none', fontSize: '0.85rem', color: '#e6edf3',
                            padding: '4px 0',
                        }}
                    />
                </div>
            )}

            {/* Hover style for edit button */}
            <style>{`
                div:hover > .task-edit-btn {
                    opacity: 1 !important;
                }
            `}</style>
        </div>
    );
}
