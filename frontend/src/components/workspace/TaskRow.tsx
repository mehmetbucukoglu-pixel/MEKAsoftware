'use client';

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Trash2, MoreVertical, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
    id: string;
    title: string;
    status: string;
    priority?: string;
    assignee?: {
        firstName: string;
        lastName: string;
    };
}

interface TaskRowProps {
    task: Task;
    onToggleStatus: (id: string, currentStatus: string) => void;
    onDelete: (id: string) => void;
    onUpdateTitle: (id: string, newTitle: string) => void;
    onOpenDetail: () => void;
}

export function TaskRow({ task, onToggleStatus, onDelete, onUpdateTitle, onOpenDetail }: TaskRowProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(task.title);
    const isDone = task.status === 'DONE';

    const handleBlur = () => {
        setIsEditing(false);
        if (title !== task.title) {
            onUpdateTitle(task.id, title);
        }
    };

    return (
        <div className="group flex items-center gap-3 px-4 h-9 hover:bg-white/5 transition-all border-b border-white/5 last:border-0 rounded-lg mx-2 mb-0.5">
            <Checkbox
                checked={isDone}
                onCheckedChange={() => onToggleStatus(task.id, task.status)}
                className="rounded-full border-muted-foreground/30 data-[state=checked]:bg-primary/50 data-[state=checked]:border-primary"
            />

            <div className="flex-1 min-w-0">
                {isEditing ? (
                    <Input
                        autoFocus
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={handleBlur}
                        onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
                        className="h-7 text-sm bg-background/50 border-none focus-visible:ring-1 focus-visible:ring-primary/30 p-0 px-1 shadow-none"
                    />
                ) : (
                    <span
                        onClick={onOpenDetail}
                        className={cn(
                            "text-sm cursor-pointer block truncate font-medium transition-colors",
                            isDone ? "text-white/20 line-through decoration-white/10" : "text-white/70 hover:text-white"
                        )}
                    >
                        {task.title}
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                <div className="flex -space-x-1">
                    {task.assignee ? (
                        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary border border-background shadow-sm" title={task.assignee.firstName}>
                            {task.assignee.firstName[0]}
                        </div>
                    ) : (
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full text-muted-foreground hover:text-primary">
                            <User className="h-3 w-3" />
                        </Button>
                    )}
                </div>

                <Button variant="ghost" size="icon" className="h-6 w-6 text-white/30 hover:text-destructive transition-colors" onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>

                <Button variant="ghost" size="icon" className="h-6 w-6 text-white/30 hover:bg-white/10 transition-colors" onClick={(e) => { e.stopPropagation(); onOpenDetail(); }}>
                    <MessageSquare className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
}
