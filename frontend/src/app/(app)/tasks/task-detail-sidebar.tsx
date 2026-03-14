'use client';

import { useState } from 'react';
import { Task, taskApi } from '@/lib/taskApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, CheckCircle2, MessageSquare, Clock, SendHorizontal } from 'lucide-react';
import { toast } from 'sonner';

interface TaskDetailSidebarProps {
    task: Task | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export function TaskDetailSidebar({ task, isOpen, onClose, onUpdate }: TaskDetailSidebarProps) {
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (!task || !isOpen) return null;

    const handleStatusChange = async (newStatus: Task['status']) => {
        try {
            await taskApi.update(task.id, { status: newStatus });
            toast.success('Görev durumu güncellendi');
            onUpdate();
        } catch (error) {
            toast.error('Durum güncellenemedi');
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;

        try {
            setSubmitting(true);
            await taskApi.addComment(task.id, newComment);
            setNewComment('');
            onUpdate(); // Refresh task to get new comment
        } catch (error) {
            toast.error('Yorum eklenemedi');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Sidebar Panel */}
            <div className="fixed inset-y-0 right-0 w-[400px] bg-background border-l shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center space-x-2">
                        <Button
                            variant={task.status === 'DONE' ? "default" : "outline"}
                            size="sm"
                            className={task.status === 'DONE' ? 'bg-green-600 hover:bg-green-700' : ''}
                            onClick={() => handleStatusChange(task.status === 'DONE' ? 'TODO' : 'DONE')}
                        >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            {task.status === 'DONE' ? 'Tamamlandı' : 'Tamamla'}
                        </Button>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Content */}
                <ScrollArea className="flex-1 p-6">
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-semibold mb-2">{task.title}</h2>
                            <div className="flex items-center text-sm text-muted-foreground space-x-4">
                                <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> Oluşturuldu: {new Date(task.createdAt).toLocaleDateString('tr-TR')}</span>
                            </div>
                        </div>

                        {task.description && (
                            <div className="text-sm bg-muted/30 p-4 rounded-lg border">
                                {task.description}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground mb-1">Oluşturan</p>
                                <p className="font-medium">{task.creator.firstName} {task.creator.lastName}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground mb-1">Atanan</p>
                                <p className="font-medium">{task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'Atanmadı'}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground mb-1">Öncelik</p>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium 
                     ${task.priority === 'HIGH' ? 'bg-red-100 text-red-700' :
                                        task.priority === 'MEDIUM' ? 'bg-orange-100 text-orange-700' :
                                            'bg-slate-100 text-slate-700'}`}>
                                    {task.priority === 'HIGH' ? 'Yüksek' : task.priority === 'MEDIUM' ? 'Orta' : 'Düşük'}
                                </span>
                            </div>
                        </div>

                        <div className="border-t pt-6 mt-6">
                            <h3 className="font-medium flex items-center mb-4">
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Yorumlar ({task.comments?.length || 0})
                            </h3>

                            <div className="space-y-4 mb-6">
                                {task.comments?.map(comment => (
                                    <div key={comment.id} className="flex space-x-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs">
                                            {comment.user.firstName[0]}{comment.user.lastName[0]}
                                        </div>
                                        <div className="flex-1 bg-muted/40 p-3 rounded-2xl rounded-tl-sm border">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <span className="text-sm font-medium">{comment.user.firstName}</span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {new Date(comment.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-700">{comment.content}</p>
                                        </div>
                                    </div>
                                ))}

                                {task.comments?.length === 0 && (
                                    <p className="text-sm text-center text-muted-foreground py-4">İlk yorumu siz yapın...</p>
                                )}
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                {/* Comment Input */}
                <div className="p-4 border-t bg-muted/10">
                    <div className="relative flex items-center">
                        <Input
                            placeholder="Göreve yorum yazın..."
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAddComment();
                                }
                            }}
                            className="pr-12 py-6 rounded-full"
                        />
                        <Button
                            size="icon"
                            className="absolute right-1 w-10 h-10 rounded-full"
                            disabled={!newComment.trim() || submitting}
                            onClick={handleAddComment}
                        >
                            <SendHorizontal className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

            </div>
        </>
    );
}
